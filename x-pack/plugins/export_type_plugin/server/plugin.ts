/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { ConfigSchema } from '@kbn/reporting-plugin/server/config';
import { ExportTypePluginPluginSetup, ExportTypePluginPluginStart } from './types';

const exportTypes = [
  // new CsvExportType(),
  // new PdfExportType(),
  // new PngExportType(),
];

export class ExportTypePlugin
  implements Plugin<ExportTypePluginPluginSetup, ExportTypePluginPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext<typeof ConfigSchema>) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { reporting }: ExportTypePluginPluginSetup) {
    exportTypes.forEach((eType) => {
      reporting.getExportTypesRegistry().register(eType);
      eType.pluginSetup(pluginsSetup, this.logger);
    });
  }

  public start(core: CoreStart, plugins: ExportTypePluginPluginStart) {
    exportTypes.forEach((eType) => {
      eType.pluginStart();
    });
  }

  public stop() {}
}
