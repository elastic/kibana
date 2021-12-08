import { PluginInitializerContext } from '../../../../src/core/server';
import { CspPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new CspPlugin(initializerContext);
}

export { CspPluginSetup, CspPluginStart } from './types';
