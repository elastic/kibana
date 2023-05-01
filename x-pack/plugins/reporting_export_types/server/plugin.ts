/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from '@kbn/core/server';
import type { ReportingSetup } from '@kbn/reporting-plugin/server/types';
import { getExportType as getExportTypeCsv } from './export_types/csv_searchsource';
import { getExportType as getExportTypePng } from './export_types/png_v2';
import { getExportType as getExportTypePdf } from './export_types/printable_pdf_v2';

export interface ExportTypesPluginSetupDependencies {
  reporting: ReportingSetup;
}

/** This plugin creates the export types in export type definitions to be registered in the Reporting Export Type Registry */
export class ExportTypesPlugin implements Plugin<void, void> {
  public setup({}, { reporting }: ExportTypesPluginSetupDependencies) {
    reporting.registerExportType(getExportTypeCsv());
    reporting.registerExportType(getExportTypePng());
    reporting.registerExportType(getExportTypePdf());
  }

  // do nothing here
  public start() {}
}
