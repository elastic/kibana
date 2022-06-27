/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { GetLicense } from '.';
import { ReportingCore } from '..';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import { getReportingUsage } from './get_reporting_usage';
import { reportingSchema } from './schema';
import { ReportingUsageType } from './types';

/*
 * @return {Object} kibana usage stats type collection object
 */
export function getReportingUsageCollector(
  usageCollection: UsageCollectionSetup,
  getLicense: GetLicense,
  exportTypesRegistry: ExportTypesRegistry,
  isReady: () => Promise<boolean>
) {
  return usageCollection.makeUsageCollector<ReportingUsageType>({
    type: 'reporting',
    fetch: ({ esClient }: CollectorFetchContext) => {
      return getReportingUsage(getLicense, esClient, exportTypesRegistry);
    },
    isReady,
    schema: reportingSchema,
  });
}

export function registerReportingUsageCollector(
  reporting: ReportingCore,
  usageCollection?: UsageCollectionSetup
) {
  if (!usageCollection) {
    return;
  }

  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const getLicense = async () => {
    const { licensing } = await reporting.getPluginStartDeps();
    return await firstValueFrom(
      licensing.license$.pipe(
        map(({ isAvailable, type }) => ({
          isAvailable: () => isAvailable,
          license: {
            getType: () => type,
          },
        }))
      )
    );
  };
  const collectionIsReady = reporting.pluginStartsUp.bind(reporting);

  const collector = getReportingUsageCollector(
    usageCollection,
    getLicense,
    exportTypesRegistry,
    collectionIsReady
  );
  usageCollection.registerCollector(collector);
}
