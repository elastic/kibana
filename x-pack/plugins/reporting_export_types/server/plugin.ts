/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { ConfigSchema, ReportingConfigType } from '@kbn/reporting-plugin/server/config';
import {
  CsvSearchSourceExportType,
  CsvV2ExportType,
  ExportType,
  PdfExportType,
  PngExportType,
} from './export_types';
import { ExportTypesPluginSetup, ExportTypesPluginStart } from './types';

export class ExportTypesPlugin
  implements Plugin<{}, {}, ExportTypesPluginSetup, ExportTypesPluginStart>
{
  public exportTypes: ExportType[];

  constructor(
    private core: CoreSetup,
    reportingConfig: ReportingConfigType,
    initializerContext: PluginInitializerContext<typeof ConfigSchema>,
    logger: Logger
  ) {
    this.exportTypes = [
      new CsvSearchSourceExportType(this.core, reportingConfig, logger, initializerContext),
      new CsvV2ExportType(this.core, reportingConfig, logger, initializerContext),
      new PdfExportType(this.core, reportingConfig, logger, initializerContext),
      new PngExportType(this.core, reportingConfig, logger, initializerContext),
    ];
    logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, pluginsSetup: ExportTypesPluginSetup) {
    const { reporting } = pluginsSetup;
    this.exportTypes.forEach((eType) => {
      reporting.registerExportTypes(eType);
    });
    return {};
  }

  public start(core: CoreStart, plugins: ExportTypesPluginStart) {
    return {};
  }

  public stop() {}
}
