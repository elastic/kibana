/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';
import { getIndicesStats } from './indices_stats_collector';
import { getResourcesStats } from './resources_stats_collector';
import { cspmUsageSchema } from './schema';
import { CspmUsage, type CloudSecurityUsageCollectorType } from './types';
import { getAccountsStats } from './accounts_stats_collector';
import { getRulesStats } from './rules_stats_collector';
import { getInstallationStats } from './installation_stats_collector';
import { getAlertsStats } from './alert_stats_collector';
import { getAllCloudAccountsStats } from './cloud_accounts_stats_collector';
import { getMutedRulesStats } from './muted_rules_stats_collector';
import { INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE } from '../../../../common/constants';

export function registerCspmUsageCollector(
  logger: Logger,
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  usageCollection?: UsageCollectionSetup
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered
  if (!usageCollection) {
    return;
  }

  // Create usage collector
  const cspmUsageCollector = usageCollection.makeUsageCollector<CspmUsage>({
    type: 'cloud_security_posture',
    isReady: async () => {
      await coreServices;
      return true;
    },
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const awaitPromiseSafe = async <T>(
        taskName: CloudSecurityUsageCollectorType,
        promise: Promise<T>
      ) => {
        try {
          const val = await promise;
          logger.info(`Cloud Security telemetry: ${taskName} payload was sent successfully`);
          return val;
        } catch (error) {
          logger.error(`${taskName} task failed: ${error.message}`);
          logger.error(error.stack);
          return error;
        }
      };

      const esClient = collectorFetchContext.esClient;
      const soClient = collectorFetchContext.soClient;
      const encryptedSoClient = (await coreServices)[0].savedObjects.createInternalRepository([
        INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      ]);

      const [
        indicesStats,
        accountsStats,
        resourcesStats,
        rulesStats,
        installationStats,
        alertsStats,
        cloudAccountStats,
        mutedRulesStats,
      ] = await Promise.all([
        awaitPromiseSafe('Indices', getIndicesStats(esClient, soClient, coreServices, logger)),
        awaitPromiseSafe('Accounts', getAccountsStats(esClient, logger)),
        awaitPromiseSafe('Resources', getResourcesStats(esClient, logger)),
        awaitPromiseSafe('Rules', getRulesStats(esClient, logger)),
        awaitPromiseSafe(
          'Installation',
          getInstallationStats(esClient, soClient, coreServices, logger)
        ),
        awaitPromiseSafe('Alerts', getAlertsStats(esClient, logger)),
        awaitPromiseSafe(
          'Cloud Accounts',
          getAllCloudAccountsStats(esClient, encryptedSoClient, logger)
        ),
        awaitPromiseSafe('Muted Rules', getMutedRulesStats(soClient, encryptedSoClient, logger)),
      ]);
      return {
        indices: indicesStats,
        accounts_stats: accountsStats,
        resources_stats: resourcesStats,
        rules_stats: rulesStats,
        installation_stats: installationStats,
        alerts_stats: alertsStats,
        cloud_account_stats: cloudAccountStats,
        muted_rules_stats: mutedRulesStats,
      };
    },
    schema: cspmUsageSchema,
  });

  // Register usage collector
  usageCollection.registerCollector(cspmUsageCollector);
}
