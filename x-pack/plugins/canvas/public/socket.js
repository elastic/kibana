import chrome from 'ui/chrome';
import io from 'socket.io-client';
import { functionsRegistry } from '../common/lib/functions_registry';
import { loadBrowserPlugins } from './lib/load_browser_plugins';

const basePath = chrome.getBasePath();
export const socket = io(undefined, { path: `${basePath}/socket.io` });

socket.on('getFunctionList', () => {
  const pluginsLoaded = loadBrowserPlugins();

  pluginsLoaded.then(() => socket.emit('functionList', functionsRegistry.toJS()));
});
