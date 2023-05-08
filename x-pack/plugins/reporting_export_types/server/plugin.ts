/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, PluginInitializerContext, Logger, CoreSetup } from '@kbn/core/server';
import { FieldFormatsSetup } from '@kbn/field-formats-plugin/server';
import type {
  CreateJobFn,
  ExportTypeDefinition,
  ReportingSetup,
  RunTaskFn,
} from '@kbn/reporting-plugin/server/types';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import {
  getTypeCsv,
  getTypeCsvFromSavedObject,
  getTypeCsvFromSavedObjectImmediate,
  getTypePng,
  getTypePngV2,
  getTypePrintablePdf,
  getTypePrintablePdfV2,
} from '.';
import { ReportingExportTypesCore } from './core';
import { setFieldFormats } from './services/services';

export interface ExportTypesPluginSetupDependencies {
  reporting: ReportingSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface ExportTypesPluginStartDependencies {
  screenshotting: ScreenshottingStart;
}

/** This plugin creates the export types in export type definitions to be registered in the Reporting Export Type Registry */
export class ExportTypesPlugin implements Plugin<void, void> {
  private logger: Logger;

  constructor(private initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, { reporting, fieldFormats }: ExportTypesPluginSetupDependencies) {
    const reportingExportTypesCore = new ReportingExportTypesCore(this.logger, this.initContext);

    /**
     * Export types to the central reporting plugin
     */
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
      if (
        getType === getTypeCsv ||
        getType === getTypeCsvFromSavedObject ||
        getType === getTypeCsvFromSavedObjectImmediate
      ) {
        return (
          // setFieldFormats(fieldFormats),
          reporting.registerExportType(
            getType() as unknown as ExportTypeDefinition<CreateJobFn<any, any>, RunTaskFn<any>>
          ),
          setFieldFormats(fieldFormats)
        );
      } else {
        return reporting.registerExportType(
          getType() as unknown as ExportTypeDefinition<CreateJobFn<any, any>, RunTaskFn<any>>
        );
      }
    });

    /**
     * Export Types Plugin Routes
     */
    // registerRoutes(reportingExportTypesCore, this.logger);
  }

  // do nothing
  public start({}, {}) {}
}
