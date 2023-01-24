/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

interface Config {
  isCloudEnabled: boolean;
  trialEndDate?: string;
  isElasticStaffOwned?: boolean;
}

interface CloudUsage {
  isCloudEnabled: boolean;
  trialEndDate?: string;
  inTrial?: boolean;
  isElasticStaffOwned?: boolean;
}

export function createCloudUsageCollector(usageCollection: UsageCollectionSetup, config: Config) {
  const { isCloudEnabled, trialEndDate, isElasticStaffOwned } = config;
  const trialEndDateMs = trialEndDate ? new Date(trialEndDate).getTime() : undefined;
  return usageCollection.makeUsageCollector<CloudUsage>({
    type: 'cloud',
    isReady: () => true,
    schema: {
      isCloudEnabled: { type: 'boolean' },
      trialEndDate: { type: 'date' },
      inTrial: { type: 'boolean' },
      isElasticStaffOwned: { type: 'boolean' },
    },
    fetch: () => {
      return {
        isCloudEnabled,
        isElasticStaffOwned,
        trialEndDate,
        ...(trialEndDateMs ? { inTrial: Date.now() <= trialEndDateMs } : {}),
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
