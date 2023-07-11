/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { ReportingConfigType } from '@kbn/reporting-plugin/server/config';
import {
  CsvSearchSourceExportType,
  CsvV2ExportType,
  ExportType,
  PdfExportType,
  PngExportType,
} from './export_types/export_type';
import { ExportTypesPluginSetup, ExportTypesPluginStart } from './types';

export class ExportTypesPlugin
  implements Plugin<{}, {}, ExportTypesPluginSetup, ExportTypesPluginStart>
{
  private logger: Logger;
  exportTypes: ExportType[] = [];

  constructor(context: PluginInitializerContext<ReportingConfigType>) {
    this.logger = context.logger.get();
  }

  public setup({}, pluginsSetup: ExportTypesPluginSetup) {
    const { reporting } = pluginsSetup;
    this.exportTypes = [
      new CsvSearchSourceExportType(this.logger, context),
      new CsvV2ExportType(this.logger, context),
      new PdfExportType(this.logger, context),
      new PngExportType(this.logger, context),
    ];
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
