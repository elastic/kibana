/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ReportingCore } from '../';
import { KIBANA_REPORTING_TYPE } from '../../common/constants';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import { ReportingSetupDeps } from '../types';
import { GetLicense } from './';
import { getReportingUsage } from './get_reporting_usage';
import { RangeStats } from './types';

// places the reporting data as kibana stats
const METATYPE = 'kibana_stats';

/*
 * @return {Object} kibana usage stats type collection object
 */
export function getReportingUsageCollector(
  reporting: ReportingCore,
  usageCollection: UsageCollectionSetup,
  getLicense: GetLicense,
  exportTypesRegistry: ExportTypesRegistry,
  isReady: () => Promise<boolean>
) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_REPORTING_TYPE,
    fetch: (callCluster: CallCluster) => {
      const config = reporting.getConfig();
      return getReportingUsage(config, getLicense, callCluster, exportTypesRegistry);
    },
    isReady,

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.reporting namespace of the data payload
     */
    formatForBulkUpload: (result: RangeStats) => {
      return {
        type: METATYPE,
        payload: {
          usage: {
            xpack: {
              reporting: result,
            },
          },
        },
      };
    },
  });
}

export function registerReportingUsageCollector(
  reporting: ReportingCore,
  { licensing, usageCollection }: ReportingSetupDeps
) {
  if (!usageCollection) {
    return;
  }

  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const getLicense = async () => {
    return await licensing.license$
      .pipe(
        map(({ isAvailable, type }) => ({
          isAvailable: () => isAvailable,
          license: {
            getType: () => type,
          },
        })),
        first()
      )
      .toPromise();
  };
  const collectionIsReady = reporting.pluginStartsUp.bind(reporting);

  const collector = getReportingUsageCollector(
    reporting,
    usageCollection,
    getLicense,
    exportTypesRegistry,
    collectionIsReady
  );
  usageCollection.registerCollector(collector);
}
