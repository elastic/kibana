/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

export interface CloudUsageCollectorConfig {
  isCloudEnabled: boolean;
  // Using * | undefined instead of ?: to force the calling code to list all the options (even when they can be undefined)
  trialEndDate: string | undefined;
  isElasticStaffOwned: boolean | undefined;
  deploymentId: string | undefined;
  projectId: string | undefined;
  projectType: string | undefined;
}

interface CloudUsage {
  isCloudEnabled: boolean;
  trialEndDate?: string;
  inTrial?: boolean;
  isElasticStaffOwned?: boolean;
  deploymentId?: string;
  projectId?: string;
  projectType?: string;
}

export function createCloudUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: CloudUsageCollectorConfig
) {
  const {
    isCloudEnabled,
    trialEndDate,
    isElasticStaffOwned,
    deploymentId,
    projectId,
    projectType,
  } = config;
  const trialEndDateMs = trialEndDate ? new Date(trialEndDate).getTime() : undefined;
  return usageCollection.makeUsageCollector<CloudUsage>({
    type: 'cloud',
    isReady: () => true,
    schema: {
      isCloudEnabled: { type: 'boolean' },
      trialEndDate: { type: 'date' },
      inTrial: { type: 'boolean' },
      isElasticStaffOwned: { type: 'boolean' },
      deploymentId: {
        type: 'keyword',
        _meta: { description: 'The ESS Deployment ID' },
      },
      projectId: {
        type: 'keyword',
        _meta: { description: 'The Serverless Project ID' },
      },
      projectType: {
        type: 'keyword',
        _meta: { description: 'The Serverless Project type' },
      },
    },
    fetch: () => {
      return {
        isCloudEnabled,
        isElasticStaffOwned,
        trialEndDate,
        ...(trialEndDateMs ? { inTrial: Date.now() <= trialEndDateMs } : {}),
        deploymentId,
        projectId,
        projectType,
      };
    },
  });
}

export function registerCloudUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  config: CloudUsageCollectorConfig
) {
  if (!usageCollection) {
    return;
  }

  const collector = createCloudUsageCollector(usageCollection, config);
  usageCollection.registerCollector(collector);
}
