/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import { CloudDefendPluginStart, CloudDefendPluginStartDeps } from '../../../types';
import { getIndicesStats } from './indices_stats_collector';
import { getPodsStats } from './pods_stats_collector';
import { cloudDefendUsageSchema } from './schema';
import { CloudDefendUsage } from './types';
import { getAccountsStats } from './accounts_stats_collector';
import { getInstallationStats } from './installation_stats_collector';

export function registerCloudDefendUsageCollector(
  logger: Logger,
  coreServices: Promise<[CoreStart, CloudDefendPluginStartDeps, CloudDefendPluginStart]>,
  usageCollection?: UsageCollectionSetup
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered
  if (!usageCollection) {
    logger.debug('Usage collection disabled');
    return;
  }

  // Create usage collector
  const cloudDefendUsageCollector = usageCollection.makeUsageCollector<CloudDefendUsage>({
    type: 'cloud_defend',
    isReady: async () => {
      await coreServices;
      return true;
    },
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      logger.debug('Starting cloud_defend usage collection');

      const [indicesStats, accountsStats, podsStats, installationStats] = await Promise.all([
        getIndicesStats(
          collectorFetchContext.esClient,
          collectorFetchContext.soClient,
          coreServices,
          logger
        ),
        getAccountsStats(collectorFetchContext.esClient, logger),
        getPodsStats(collectorFetchContext.esClient, logger),
        getInstallationStats(
          collectorFetchContext.esClient,
          collectorFetchContext.soClient,
          coreServices,
          logger
        ),
      ]).catch((err) => {
        logger.error(err);

        return err;
      });

      return {
        indices: indicesStats,
        accounts_stats: accountsStats,
        pods_stats: podsStats,
        installation_stats: installationStats,
      };
    },
    schema: cloudDefendUsageSchema,
  });

  // Register usage collector
  usageCollection.registerCollector(cloudDefendUsageCollector);
}
