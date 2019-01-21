/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { Socket } from 'socket.io';

import { Logger } from '../log';
import { SocketService } from '../socket_service';

export function socketRoute(server: Server, socketService: SocketService, log: Logger) {
  const socketIO = socketService.io;

  socketIO.on('connection', (socket: Socket) => {
    log.debug(`User ${socket.id} connected, attaching handlers and register socket.`);

    // TODO(mengwei): apply the same security check as Canvas does.
    // const request = socket.handshake;
    // const authHeader = getAuthHeader(request, server);

    socket.on('disconnect', () => {
      log.debug('User disconnected, removing handlers and unregister sockets.');
    });
  });
}
