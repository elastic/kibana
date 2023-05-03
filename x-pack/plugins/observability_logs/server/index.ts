import { PluginInitializerContext } from '../../../../src/core/server';
import { ObservabilityLogsPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ObservabilityLogsPlugin(initializerContext);
}

export type { ObservabilityLogsPluginSetup, ObservabilityLogsPluginStart } from './types';
