import { PluginInitializerContext } from '../../../src/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { SlosPlugin } = await import('./plugin');
  return new SlosPlugin(initializerContext);
}

export type { SlosPluginSetup, SlosPluginStart } from './types';
