import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { AssetInventoryPlugin } = await import('./plugin');
  return new AssetInventoryPlugin(initializerContext);
}

export type { AssetInventoryPluginSetup, AssetInventoryPluginStart } from './types';
