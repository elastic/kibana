import { PluginInitializerContext } from '../../../../src/core/server';
import { EcsMapperPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new EcsMapperPlugin(initializerContext);
}

export { EcsMapperPluginSetup, EcsMapperPluginStart } from './types';
