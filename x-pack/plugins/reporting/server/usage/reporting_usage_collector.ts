/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, map } from 'rxjs';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { ICollector } from '@kbn/usage-collection-plugin/server/collector/types';
import { ReportingCore } from '..';
import { ReportingSchema } from './collection_schema';

export interface ReportingUsageType {
  available: boolean;
  enabled: boolean;
}

export function registerReportingUsageCollector(
  reporting: ReportingCore,
  usageCollection?: UsageCollectionSetup
) {
  if (!usageCollection) {
    return;
  }

  const isReady = reporting.pluginStartsUp.bind(reporting);

  const getLicense = async () => {
    const { licensing } = await reporting.getPluginStartDeps();
    return await firstValueFrom(
      licensing.license$.pipe(map(({ isAvailable }) => ({ isAvailable })))
    );
  };

  const collector: ICollector<ReportingUsageType> =
    usageCollection.makeUsageCollector<ReportingUsageType>({
      type: 'reporting',
      fetch: () =>
        getLicense().then((license) => {
          return {
            available: license.isAvailable === true, // is available under all non-expired licenses
            enabled: true, // is enabled, by nature of this code path executing
          };
        }),
      isReady,
      schema: ReportingSchema,
    });

  usageCollection.registerCollector(collector);
}
