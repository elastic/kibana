/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { getBrowserRegistries } from './lib/browser_registries';

let socket;

export function createSocket() {
  const basePath = chrome.getBasePath();
  socket = io(undefined, { path: `${basePath}/socket.io` });

  socket.on('getFunctionList', () => {
    const pluginsLoaded = getBrowserRegistries();

    pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
  });
}

export function getSocket() {
  if (!socket) throw new Error('getSocket failed, socket has not been created');
  return socket;
}
