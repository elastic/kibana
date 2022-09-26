/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/core/server';
import { getIndicesStats } from './indices_stats_collector';
import { cspmUsageSchema } from './schema';
import { CspmUsage } from './types';

export function registerCspmUsageCollector(
  logger: Logger,
  usageCollection?: UsageCollectionSetup
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered
  if (!usageCollection) {
    return;
  }

  // Create usage collector
  const cspmUsageCollector = usageCollection.makeUsageCollector<CspmUsage>({
    type: 'cloud_security_posture',
    isReady: () => true,
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const indicesStats = await getIndicesStats(collectorFetchContext.esClient, logger);
      return {
        indices: indicesStats,
      };
    },
    schema: cspmUsageSchema,
  });

  // Register usage collector
  usageCollection.registerCollector(cspmUsageCollector);
}
