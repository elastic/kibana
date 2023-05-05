import { Logger } from '@kbn/core/server';
import { ReportingExportTypesCore } from './core';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReportingExportTypesPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReportingExportTypesPluginStart {}

export type RunTaskFnFactory<RunTaskFnType> = (
  reporting: ReportingExportTypesCore,
  logger: Logger
) => RunTaskFnType;
