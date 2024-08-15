import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { SearchAssistantPlugin } = await import('./plugin');
  return new SearchAssistantPlugin(initializerContext);
}

export type { SearchAssistantPluginSetup, SearchAssistantPluginStart } from './types';
