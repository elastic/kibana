/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import type { Job } from '@kbn/reporting-plugin/public/lib/job';
import { ExportTypeEntry } from './public/export_definitions';

/**
 * The entries after being registered should have these properties
 * @public
 */
export interface ExportTypeRegistryEntry {
  // some sort of locator param
  // this is used in report_listing but might not be needed for the export type registry
  id: string;
  ilmLocator?: string; // urlService.locators.get(‘ILM_LOCATOR_ID’); // urlService is a prop
  // / prop in report_listing
  licenseSubscription: Subscription;
  // can set the job from the await apiClient.list(await this.apiClient.total())
  job: Job;
  /** this can be CSVExportType or PNG or PDF export types */
  exportTypeCategory: ExportTypeEntry;
}

// export interface ExportTypeProvider {
//   readonly id: string;
//   getExportTypeItems: () => ExportTypeEntryRegistry[];
// }

export class ExportTypesRegistry {
  public exportTypeRegistry = new Map<string, ExportTypeRegistryEntry>();

  public register(et: ExportTypeEntry) {
    this.validateExportType(et);
  }
  public getExportType(et: ExportTypeEntry) {
    this.validateExportType(et);
  }

  validateExportType(et: ExportTypeEntry) {}

  public getExportTypeRegistry() {
    return this.exportTypeRegistry;
  }
}
