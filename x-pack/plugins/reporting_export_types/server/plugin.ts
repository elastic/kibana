/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { ConfigSchema } from '@kbn/reporting-plugin/server/config';
import { ExportTypesPluginSetup, ExportTypesPluginStart } from './types';

export class ExportTypesPlugin
  implements Plugin<{}, {}, ExportTypesPluginSetup, ExportTypesPluginStart>
{
  exportTypes = [
    // new CsvExportType(),
    // new PdfExportType(),
    // new PngExportType(),
  ];

  constructor(initializerContext: PluginInitializerContext<typeof ConfigSchema>, logger: Logger) {
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
    this.exportTypes.forEach((eType) => {});
    return {};
  }

  public stop() {}
}
