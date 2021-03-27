import { PluginInitializerContext } from '../../../../src/core/server';
import { RacPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new RacPlugin(initializerContext);
}

export { RacPluginSetup, RacPluginStart } from './types';
