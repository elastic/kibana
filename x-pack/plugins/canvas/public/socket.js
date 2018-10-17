/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { loadBrowserPlugins } from './lib/load_browser_plugins';

const basePath = chrome.getSocketBasePath();
export const socket = io(undefined, { path: `${basePath}/socket.io` });

socket.on('getFunctionList', () => {
  const pluginsLoaded = loadBrowserPlugins();

  pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
});
