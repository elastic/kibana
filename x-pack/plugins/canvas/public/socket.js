/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { getBrowserRegistries } from './lib/browser_registries';

const SOCKET_CONNETION_TIMEOUT = 5000; // timeout in ms
let socket;

export async function createSocket(basePath) {
  if (socket != null) return socket;

  return new Promise((resolve, rej) => {
    // status.resolve = resolve;
    const reject = p => {
      socket = null; // reset the socket on errors
      rej(p);
    };

    socket = io({
      path: `${basePath}/socket.io`,
      transports: ['polling', 'websocket'],
      transportOptions: {
        polling: {
          extraHeaders: {
            'kbn-xsrf': 'professionally-crafted-string-of-text',
          },
        },
      },
      rememberUpgrade: false,
      timeout: SOCKET_CONNETION_TIMEOUT,
    });

    socket.on('getFunctionList', () => {
      const pluginsLoaded = getBrowserRegistries();
      pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
    });

    socket.on('connect', () => {
      resolve();
    });

    function errorHandler(err) {
      // 'connectionFailed' returns an object with a reason prop
      // other error cases provide their own error
      reject(err.reason ? new Error(err.reason) : err);
    }

    socket.on('connectionFailed', errorHandler);
    socket.on('connect_error', errorHandler);
    socket.on('connect_timeout', errorHandler);
  });
}

export function getSocket() {
  if (!socket) throw new Error('getSocket failed, socket has not been created');
  return socket;
}
