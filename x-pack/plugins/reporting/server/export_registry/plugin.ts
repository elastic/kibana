/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import type { ReportingPublicPluginSetupDendencies } from '../../public/plugin';
import type { ExportType } from '../../public/export_registry';

interface ExportTypesPluginSetupContract {
  // depends on the Reporting Plugin x-pack/plugins/reporting/public/plugin.ts
  getReportingPlugin(): ReportingPublicPluginSetupDendencies;
}

interface ExportTypesPluginStartContract {}

export class ExportTypesPlugin
  implements Plugin<ExportTypesPluginSetupContract, ExportTypesPluginStartContract>
{
  private type: any;
  private exportType?: ExportType;
  // getContract from ReportingPublicPlugin x-pack/plugins/reporting/public/plugin.ts

  private getExportType() {
    if (!this.exportType) throw new Error('');
    return this.getExportType;
  }

  public setup(core: CoreSetup<object, unknown>, plugins: object) {
    this.getExportType(this.type);
  }
  public start() {
    return this.exportType;
  }
}
