
const BitArray = require('node-bitarray');
// serial js 
const serialport = require('serialport');
let port = {};

// Express web service
const express = require('express');
const app = express();

app.get('/', (req, res, next) => {
    res.sendFile(require('path').resolve('./index.html'))
});


// web socket by socket io
let web_server = app.listen(3333, () => {
    console.log("listening on port 3333");
})

let web_socket = require('socket.io')(web_server);


web_socket.on("connection", async (socket) => {
    await socket.emit('portslist', await serialport.list());



    socket.on("disconnect", (data, data1, data2) => {
        if (port && port.isOpen)
            port.close();
    })



    socket.on("com_connect", async (com, baudRate) => {
        port = new serialport(com, { baudRate: baudRate });
        port.on("error", async (err) => {
            await socket.emit('ihaveamsg', `ERROR: ${err}`);
        });

        // ===============================
        // ===============================
        port.on("data", async (data) => {

            let bin_text = "";
            for (let i = 0; i < data.length; ++i)
                if ((i + 1) == data.length)
                    bin_text += `${(new BitArray(data[i], 8)).toString()}`;
                else
                    bin_text += `${(new BitArray(data[i], 8)).toString()} : `;

            await socket.emit('ihaveabuffer', {
                "hex":Buffer.from(data).toString('hex'),
                "bin":bin_text
            });
        });

        await socket.emit('ihaveamsg', `The port is open!`);
    });


    socket.on("bufferfromclient", async (data) => {
        if (port.isOpen)
            await port.write(data);
        else
            await socket.emit('ihaveamsg', `Select and open the port first!`);
    });


    socket.on("com_disconnect", async () => {

        try {
            if (port && port.isOpen) {
                await socket.emit('ihaveamsg', "Port is closed!");
                port.close();
            }
            else
                await socket.emit('ihaveamsg', "Port is already closed!");
        }
        catch (err) {
            await socket.emit('ihaveamsg', `Error: ${err}`);
        }

    })


    process.on("unhandledRejection", async (err) => {
        await socket.emit('ihaveamsg', `Error: ${err}`);
    });

});
