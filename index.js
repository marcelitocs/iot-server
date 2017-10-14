const WebSocket = require("ws");
const Gpio = require('onoff').Gpio;

var door = new Gpio(14, 'high');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
    console.log(`connected`);
    
    ws.isAlive = true;
    ws.on('pong', function() {
        this.isAlive = true;
    });

    ws.on('message', data => {
        console.log(`new message`, data);
        try {
            data = JSON.parse(data);
            if (typeof data.command === "undefined") {
                throw new Error("Command not defined");
            }
            if (typeof commands[data.command] === "undefined") {
                throw new Error("Command not found");
            }
            commands[data.command](ws, data.rid || 0, data.params || {});
        }
        catch (err) {
            console.log(err);
            ws.send(JSON.stringify({ rid: (data && data.rid) || 0, error: err.message }));
        }
    });
    
    ws.on('close', () => {
        console.log(`disconnected`);
    });
});

const keepAliveInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping('', false, true);
    });
}, 30000);

let commands = {
    openDoor(ws, rid, params) {
        console.log("opening the door");
        door.write(0, function(err) {
            if (err) {
                console.error(err);
                ws.send(JSON.stringify({ rid: rid, error: err.message }));
            }
            setTimeout(function() {
                door.write(1, function(err) {
                    if (err) {
                        console.error(err);
                        ws.send(JSON.stringify({ rid: rid, error: err.message }));
                    }
                    ws.send(JSON.stringify({ rid: rid, data: "OK" }));
                });
            }, 1000);
        });
    }
};

process.on('SIGINT', function() {
    door.unexport();
	process.exit();
});