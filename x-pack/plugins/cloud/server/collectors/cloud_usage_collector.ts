/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { KIBANA_CLOUD_STATS_TYPE } from '../../common/constants';

interface Config {
  isCloudEnabled: boolean;
}

export function createCloudUsageCollector(usageCollection: UsageCollectionSetup, config: Config) {
  const { isCloudEnabled } = config;
  return usageCollection.makeUsageCollector({
    type: KIBANA_CLOUD_STATS_TYPE,
    isReady: () => true,
    fetch: () => {
      return {
        isCloudEnabled,
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
