/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CustomRequestHandlerContext, IRouter, Logger } from '@kbn/core/server';
import { ReportingStart } from '@kbn/reporting-plugin/server';
import { ReportingExportTypesCore } from '../core';
import { registerDiagnosticRoutes } from './diagnostic';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate';
export { registerDiagnosticRoutes } from './diagnostic';
export type { DiagnosticResponse } from './diagnostic';

export function registerRoutes(reporting: ReportingExportTypesCore, logger: Logger) {
  registerDiagnosticRoutes(reporting, logger);
  registerGenerateCsvFromSavedObjectImmediate(reporting, logger);
}

export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
  reporting: ReportingStart | null;
}>;

export type ReportingExportTypesPluginRouter = IRouter<ReportingRequestHandlerContext>;
export type { JobParamsDownloadCSV } from './generate/csv_searchsource_immediate';
