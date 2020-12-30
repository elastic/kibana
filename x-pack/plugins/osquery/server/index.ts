import { PluginInitializerContext } from '../../../../src/core/server';
import { OsqueryPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new OsqueryPlugin(initializerContext);
}

export { OsqueryPluginSetup, OsqueryPluginStart } from './types';
