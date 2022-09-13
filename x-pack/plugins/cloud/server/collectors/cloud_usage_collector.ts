/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import { type UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

interface Config {
  isCloudEnabled: boolean;
  metadata$: Observable<Record<string, unknown>>;
}

interface CloudUsage {
  isCloudEnabled: boolean;
  metadata: Record<string, string>; // Using string instead of unknown because `telemetry-tools` will fail the validation otherwise
}

export function createCloudUsageCollector(usageCollection: UsageCollectionSetup, config: Config) {
  const { isCloudEnabled, metadata$ } = config;
  return usageCollection.makeUsageCollector<CloudUsage>({
    type: 'cloud',
    isReady: () => true,
    schema: {
      isCloudEnabled: {
        type: 'boolean',
        _meta: { description: '`true` when the deployment is running on ESS' },
      },
      metadata: {
        DYNAMIC_KEY: { type: 'keyword', _meta: { description: 'Cloud Deployment Metadata' } },
      },
    },
    fetch: async () => {
      return {
        isCloudEnabled,
        metadata: (await firstValueFrom(metadata$)) as Record<string, string>,
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
