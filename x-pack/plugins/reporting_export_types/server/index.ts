import { PluginInitializerContext } from '../../../src/core/server';
import { ReportingExportTypesPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingExportTypesPlugin(initializerContext);
}

export type { ReportingExportTypesPluginSetup, ReportingExportTypesPluginStart } from './types';
