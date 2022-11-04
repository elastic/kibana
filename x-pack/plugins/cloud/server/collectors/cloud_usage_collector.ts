/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

interface Config {
  isCloudEnabled: boolean;
  trialEndDate?: Date;
  isElasticStaffOwned?: boolean;
  inTrial$?: Observable<boolean>;
  isPaying$?: Observable<boolean>;
}

interface CloudUsage {
  isCloudEnabled: boolean;
  isElasticStaffOwned?: boolean;
  trialEndDate?: string;
  inTrial?: boolean;
  isPaying?: boolean;
}

export function createCloudUsageCollector(usageCollection: UsageCollectionSetup, config: Config) {
  const { isCloudEnabled, trialEndDate, isElasticStaffOwned, inTrial$, isPaying$ } = config;
  return usageCollection.makeUsageCollector<CloudUsage>({
    type: 'cloud',
    isReady: () => true,
    schema: {
      isCloudEnabled: { type: 'boolean' },
      isElasticStaffOwned: { type: 'boolean' },
      trialEndDate: { type: 'date' },
      inTrial: { type: 'boolean' },
      isPaying: { type: 'boolean' },
    },
    fetch: async () => {
      return {
        isCloudEnabled,
        isElasticStaffOwned,
        trialEndDate: trialEndDate?.toISOString(),
        ...(inTrial$ ? { inTrial: await firstValueFrom(inTrial$) } : {}),
        ...(isPaying$ ? { isPaying: await firstValueFrom(isPaying$) } : {}),
      };
    },
  });
}

export function registerCloudUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  config: Config
) {
  if (!usageCollection) {
    return;
  }

  const collector = createCloudUsageCollector(usageCollection, config);
  usageCollection.registerCollector(collector);
}
