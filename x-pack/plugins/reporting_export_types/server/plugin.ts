/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, PluginInitializerContext, Logger, CoreSetup, CoreStart } from '@kbn/core/server';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { ReportingSetup } from '@kbn/reporting-plugin/server/types';
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
// import { setFieldFormats } from './services/services';

export interface ExportTypesPluginSetupDependencies {
  reporting: ReportingSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface ExportTypesPluginStartDependencies {
  screenshotting: ScreenshottingStart;
  fieldFormats: FieldFormatsStart;
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
    reporting.registerExportType(getTypeCsv());
    reporting.registerExportType(getTypeCsvFromSavedObject());
    // @ts-ignore
    reporting.registerExportType(getTypeCsvFromSavedObjectImmediate());
    reporting.registerExportType(getTypePng());
    reporting.registerExportType(getTypePngV2());
    reporting.registerExportType(getTypePrintablePdf());
    reporting.registerExportType(getTypePrintablePdfV2());

    /**
     * Export Types Plugin Routes
     */
    // registerRoutes(reportingExportTypesCore, this.logger);
  }

  public start(_core: CoreStart, plugins: ExportTypesPluginStartDependencies) {
    setFieldFormats(plugins.fieldFormats);
  }
}
