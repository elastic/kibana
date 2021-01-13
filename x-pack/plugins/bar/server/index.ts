import { PluginInitializerContext } from '../../../../src/core/server';
import { BarPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new BarPlugin(initializerContext);
}

export { BarPluginSetup, BarPluginStart } from './types';
