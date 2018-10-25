/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { getBrowserRegistries } from './lib/browser_registries';

let socket;

export async function createSocket(basePath) {
  if (socket != null) return socket;

  const status = {};

  socket = io({ path: `${basePath}/socket.io` });

  socket.on('getFunctionList', () => {
    const pluginsLoaded = getBrowserRegistries();

    pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
  });

  socket.on('connect', () => {
    status.resolve();
  });

  function errorHandler(err) {
    if (!err instanceof Error) {
      const { reason } = err;
      if (reason) status.reject(new Error(reason));
    }

    status.reject(err);
  }

  socket.on('connectionFailed', errorHandler);
  socket.on('connect_error', errorHandler);
  socket.on('connect_timeout', errorHandler);

  return new Promise((resolve, reject) => {
    status.resolve = resolve;
    status.reject = p => {
      socket = null;
      reject(p);
    };
  });
}

export function getSocket() {
  if (!socket) throw new Error('getSocket failed, socket has not been created');
  return socket;
}
