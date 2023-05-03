/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreStart, PluginInitializerContext, Logger } from '@kbn/core/server';
import { ReportingCore } from '@kbn/reporting-plugin/server';
import type {
  CreateJobFn,
  ExportTypeDefinition,
  ReportingSetup,
  ReportingStartDeps,
  RunTaskFn,
} from '@kbn/reporting-plugin/server/types';
import {
  getTypeCsv,
  getTypeCsvFromSavedObject,
  getTypeCsvFromSavedObjectImmediate,
  getTypePng,
  getTypePngV2,
  getTypePrintablePdf,
  getTypePrintablePdfV2,
  registerRoutes,
} from '.';
import { setFieldFormats } from './services/services';

export interface ExportTypesPluginSetupDependencies {
  reporting: ReportingSetup;
  routes: ReportingCore['pluginSetup'];
}

/** This plugin creates the export types in export type definitions to be registered in the Reporting Export Type Registry */
export class ExportTypesPlugin implements Plugin<void, void> {
  private logger: Logger;

  constructor(private initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup({}, { reporting }: ExportTypesPluginSetupDependencies) {
    const reportingCore = new ReportingCore(this.logger, this.initContext);

    type CreateFnType = CreateJobFn<any, any>; // can not specify params types because different type of params are not assignable to each other
    type RunFnType = any; // can not specify because ImmediateExecuteFn is not assignable to RunTaskFn
    const getTypeFns: Array<() => ExportTypeDefinition<CreateFnType | null, RunFnType>> = [
      getTypeCsv,
      getTypeCsvFromSavedObject,
      getTypeCsvFromSavedObjectImmediate,
      getTypePng,
      getTypePngV2,
      getTypePrintablePdf,
      getTypePrintablePdfV2,
    ];
    getTypeFns.forEach((getType) => {
      reporting.registerExportType(
        getType() as unknown as ExportTypeDefinition<CreateJobFn<any, any>, RunTaskFn<any>>
      );
    });

    // Routes
    registerRoutes(reportingCore, this.logger);
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    setFieldFormats(plugins.fieldFormats);
    return (core = core);
  }
}
