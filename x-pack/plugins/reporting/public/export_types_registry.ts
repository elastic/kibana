/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subscription } from 'rxjs';
import type { Job } from './lib/job';

// these types go into the registry and need to include the following properties
export interface ExportType {
  // some sort of locator param
  // this is used in report_listing but might not be needed for the export type registry
  ilmLocator?: string; // urlService.locators.get(‘ILM_LOCATOR_ID’); // urlService is a prop
  // / prop in report_listing
  licenseSubscription: Subscription;
  // can set the job from the await apiClient.list(await this.apiClient.total())
  jobs: Job[];
}

export interface ExportTypeProvider {
  readonly id: string;
  getExportTypeItems: () => ExportType[];
}

// this is created by the reporting plugin from the setup and registerExportType()
export class ExportTypesRegistry {
  // what data structure should the registry be share_menu_registry is a Map
  private exportTypeRegistry = new Map<string, ExportTypeProvider>();

  public register(et: ExportType) {
    // validation of export type
    this.validateExportType(et);
  }
  public getExportType(et: ExportType) {
    this.validateExportType(et);
  }

  validateExportType(et: ExportType) {}

  public getExportTypeRegistry() {
    return this.exportTypeRegistry;
  }
}
