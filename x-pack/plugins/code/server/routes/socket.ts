/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import { Handshake, Socket } from 'socket.io';

import { Logger } from '../log';
import { SocketService } from '../socket_service';

function getRequest(server: Server, { headers }: Handshake) {
  const url = `/api/code/ping`;

  return server
    .inject({
      method: 'POST',
      url,
      headers,
    })
    .then(res => {
      if (res.statusCode !== 200) {
        throw Boom.unauthorized('Failed to authenticate socket connection');
      }
      return res.request;
    });
}

async function getModifiedRequest(server: Server, socket: Socket) {
  try {
    return await getRequest(server, socket.handshake);
  } catch (err) {
    // on errors, notify the client and close the connection
    socket.emit('connectionFailed', { reason: err.message || 'Socket connection failed' });
    socket.disconnect(true);
    return false;
  }
}

export function socketRoute(server: Server, socketService: SocketService, log: Logger) {
  const socketIO = socketService.io;

  // add a POST ping route for `getRequest` to use
  server.route({
    method: 'POST',
    path: `/api/code/ping`,
    handler: () => 'pong',
  });

  socketIO.on('connection', async (socket: Socket) => {
    log.info(`User ${socket.id} connected, attaching handlers and register socket.`);
    // 'request' is the modified hapi request object
    const request = await getModifiedRequest(server, socket);
    if (!request) {
      log.error(`Request object not found. Disconnect the socket.`);
      return socket.disconnect();
    }

    socket.on('disconnect', () => {
      log.debug('User disconnected, removing handlers and unregister sockets.');
    });
  });
}
