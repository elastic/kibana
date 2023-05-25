import { PluginInitializerContext } from '../../../src/core/server';
import { ExportTypePluginPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ExportTypePluginPlugin(initializerContext);
}

export type { ExportTypePluginPluginSetup, ExportTypePluginPluginStart } from './types';
