/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExportTypesRegistry } from '../lib/export_types_registry';
import { FeaturesAvailability } from './';
import { JobTypes } from './types';

/*
 * Gets a handle to the Reporting export types registry and returns a few
 * functions for examining them
 * @return {Object} export type handler
 */
export function getExportTypesHandler(exportTypesRegistry: ExportTypesRegistry) {
  return {
    /*
     * Allow usage collection to loop through each registered job type
     */
    getJobTypes(): Array<keyof JobTypes> {
      return exportTypesRegistry.getAll().map(({ jobType }) => jobType as keyof JobTypes);
    },

    /*
     * Based on the X-Pack license and which export types are available,
     * returns an object where the keys are the export types and the values are
     * a boolean for whether or not the export type is provided by the license.
     * @param {Object} xpackInfo: xpack_main plugin info object
     * @return {Object} availability of each export type
     */
    getAvailability(featuresAvailability: FeaturesAvailability): { [exportType: string]: boolean } {
      const exportTypesAvailability: { [exportType: string]: boolean } = {};
      const xpackInfoAvailable = featuresAvailability && featuresAvailability.isAvailable();
      const licenseType = featuresAvailability.license.getType();
      if (!licenseType) {
        throw new Error('No license type returned from XPackMainPlugin#info!');
      }
      for (const exportType of exportTypesRegistry.getAll()) {
        exportTypesAvailability[exportType.jobType] = xpackInfoAvailable
          ? exportType.validLicenses.includes(licenseType)
          : false;
      }

      return exportTypesAvailability;
    },

    /*
     * @return {Number} the number of export types in the registry
     */
    getNumExportTypes() {
      return exportTypesRegistry.getSize();
    },
  };
}

export type ExportTypesHandler = ReturnType<typeof getExportTypesHandler>;
