/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { loadBrowserPlugins } from './lib/load_browser_plugins';

let socket;

export function createSocket(basePath) {
  socket = io(undefined, { path: `${basePath}/socket.io` });

  socket.on('getFunctionList', () => {
    const pluginsLoaded = loadBrowserPlugins();

    pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
  });
}

export function getSocket() {
  if (!socket) throw new Error('getSocket failed, socket has not been created');
  return socket;
}
