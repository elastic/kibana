/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from '@kbn/core/server';
import { ReportingSetup } from '@kbn/reporting-plugin/server/types';
import { ExportTypeDefinition } from './export_types/types';

export interface ExportTypesPluginSetupDependencies {
  // this plugin is dependent on the Reporting plugin
  reporting: ReportingSetup;
}

/** This plugin creates the export types in export type definitions to be registered in the Reporting Export Type Registry */
export class ExportTypesPlugin implements Plugin<void, void> {
  public exportTypeEntry: ExportTypeDefinition | undefined;
  // on setup() this plugin needs to use the reporting plugin to register the export types
  public setup({}, { reporting }: ExportTypesPluginSetupDependencies) {
    reporting.registerExportType(this.exportTypeEntry);
  }

  // do nothing here
  public start() {}
}
