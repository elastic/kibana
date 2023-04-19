import { PluginInitializerContext } from '@kbn/core/server';
import { ReportingExportTypesPlugin } from '../public/plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingExportTypesPlugin(initializerContext);
}

export type { ReportingExportTypesPluginSetup, ReportingExportTypesPluginStart } from './types';
