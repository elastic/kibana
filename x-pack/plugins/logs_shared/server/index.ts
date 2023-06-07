import { PluginInitializerContext } from '../../../../src/core/server';
import { LogsSharedPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new LogsSharedPlugin(initializerContext);
}

export type { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';
