/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { KIBANA_CLOUD_STATS_TYPE } from '../../common/constants';
import { CoreSetup } from 'kibana/server';

export interface UsageStats {
  isCloudEnabled: boolean;
}

export function createCollectorFetch(core: CoreSetup) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const cloudId = core.getServerConfig().get<string>('xpack.cloud.id', null);

    return {
      isCloudEnabled: !!cloudId,
    };
  };
}

export function createCloudUsageCollector(usageCollection: UsageCollectionSetup, core: CoreSetup) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_CLOUD_STATS_TYPE,
    isReady: () => true,
    fetch: createCollectorFetch(core),
  });
}

export function registerCloudUsageCollector(usageCollection: UsageCollectionSetup, core: CoreSetup) {
  if (!usageCollection) {
    return;
  }

  const collector = createCloudUsageCollector(usageCollection, core);
  usageCollection.registerCollector(collector);
}
