/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { Socket } from 'socket.io';

import { Logger } from '../log';
import { getModifiedSocketRequest } from '../security';
import { SocketService } from '../socket_service';

export function socketRoute(server: Server, socketService: SocketService, log: Logger) {
  const socketIO = socketService.io;

  // add a POST ping route for `getRequest` to use
  server.securedRoute({
    method: 'POST',
    path: `/api/code/ping`,
    handler: () => 'pong',
  });

  socketIO.on('connection', async (socket: Socket) => {
    log.info(`User ${socket.id} connected, attaching handlers and register socket.`);
    // 'request' is the modified hapi request object
    const request = await getModifiedSocketRequest(server, socket);
    if (!request) {
      socket.emit('connectionFailed', 'Socket connection failed');
      return socket.disconnect(true);
    }

    socket.on('disconnect', () => {
      log.debug('User disconnected, removing handlers and unregister sockets.');
    });
  });
}
