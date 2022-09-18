/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getIndicesStats } from './indices_stats_collector';
import { cspmUsageSchema } from './schema';
import { CspmUsage } from './types';

export function registerIndicesCounterCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const indicesCounterCollector = usageCollection.makeUsageCollector<CspmUsage>({
    type: 'cloud_security_posture',
    isReady: () => true,
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const indicesStats = await getIndicesStats(collectorFetchContext.esClient);
      return {
        indices: indicesStats,
      };
    },
    schema: cspmUsageSchema,
  });

  // register usage collector
  usageCollection.registerCollector(indicesCounterCollector);
}
