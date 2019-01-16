/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import SocketIO, { Socket } from 'socket.io';
import ClientIO from 'socket.io-client';

import { SocketKind } from '../../model';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { BASE_PLACEHOLDER, mainNodeBaseUrl } from './redirect';

export async function redirectSocketRoute(
  server: Server,
  serverOptions: ServerOptions,
  log: Logger
) {
  const socketIO = SocketIO(server.listener, { path: '/ws' });
  let redirectUrl = serverOptions.redirectToNode;
  const hasBaseUrl = redirectUrl.includes(BASE_PLACEHOLDER);

  async function connectToMainNode() {
    let baseUrl = '';
    if (hasBaseUrl) {
      baseUrl = await mainNodeBaseUrl(redirectUrl);
      redirectUrl = serverOptions.redirectToNode.replace(BASE_PLACEHOLDER, '');
    }
    const socketUrl = `${redirectUrl}`;
    return ClientIO(socketUrl, { path: `${baseUrl}/ws` });
  }
  // maintain a connection to main node
  let mainNodeSocket = await connectToMainNode();
  mainNodeSocket.on('connect', () => {
    log.info('connected to main node websocket');
  });
  mainNodeSocket.on('disconnect', async () => {
    log.info('reconnecting to main node websocket');
    mainNodeSocket = await connectToMainNode();
  });

  // Currently we only receive broadcast events from the server to the client.
  // Therefore, it is sufficient to keep a single connection to the primary node and listen for these events.
  const events = [SocketKind.CLONE_PROGRESS, SocketKind.DELETE_PROGRESS, SocketKind.INDEX_PROGRESS];
  events.forEach(kind => {
    mainNodeSocket.on(kind, (...args: any[]) => {
      // redirect events to our client
      log.debug(`receiving websocket ${kind} message from main node, redirect to clients`);
      socketIO.sockets.emit(kind, ...args);
    });
  });

  socketIO.on('connection', (socket: Socket) => {
    log.debug(`User ${socket.id} connected, attaching handlers and register socket.`);
  });
  socketIO.on('disconnect', () => {
    log.debug('User disconnected, removing handlers and unregister sockets.');
  });
}
