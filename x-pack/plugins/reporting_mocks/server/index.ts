import { PluginInitializerContext } from '@kbn/core/server';
import { ReportingMocksPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingMocksPlugin(initializerContext);
}

export type { ReportingMocksPluginSetup, ReportingMocksPluginStart } from './types';
