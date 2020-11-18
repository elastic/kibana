/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyClusterClient } from 'kibana/server';
import { UsageStatsPayload } from 'src/plugins/telemetry_collection_manager/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getAllStats } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';
import { getLicenses } from './get_licenses';

// TODO: To be removed in https://github.com/elastic/kibana/pull/83546
interface MonitoringCollectorOptions {
  ignoreForInternalUploader: boolean; // Allow the additional property required by bulk_uploader to be filtered out
}

export function registerMonitoringTelemetryCollection(
  usageCollection: UsageCollectionSetup,
  legacyEsClient: ILegacyClusterClient,
  maxBucketSize: number
) {
  const monitoringStatsCollector = usageCollection.makeStatsCollector<
    UsageStatsPayload[],
    unknown,
    true,
    MonitoringCollectorOptions
  >({
    type: 'monitoringTelemetry',
    isReady: () => true,
    ignoreForInternalUploader: true, // Used only by monitoring's bulk_uploader to filter out unwanted collectors
    extendFetchContext: { kibanaRequest: true },
    fetch: async ({ kibanaRequest }) => {
      const timestamp = Date.now(); // Collect the telemetry from the monitoring indices for this moment.
      // NOTE: Usually, the monitoring indices index stats for each product every 10s (by default).
      // However, some data may be delayed up-to 24h because monitoring only collects extended Kibana stats in that interval
      // to avoid overloading of the system when retrieving data from the collectors (that delay is dealt with in the Kibana Stats getter inside the `getAllStats` method).
      // By 8.x, we expect to stop collecting the Kibana extended stats and keep only the monitoring-related metrics.
      const callCluster = kibanaRequest
        ? legacyEsClient.asScoped(kibanaRequest).callAsCurrentUser
        : legacyEsClient.callAsInternalUser;
      const clusterDetails = await getClusterUuids(callCluster, timestamp, maxBucketSize);
      const [licenses, stats] = await Promise.all([
        getLicenses(clusterDetails, callCluster, maxBucketSize),
        getAllStats(clusterDetails, callCluster, timestamp, maxBucketSize),
      ]);
      return stats.map((stat) => {
        const license = licenses[stat.cluster_uuid];
        return {
          ...(license ? { license } : {}),
          ...stat,
          collectionSource: 'monitoring',
        };
      });
    },
  });
  usageCollection.registerCollector(monitoringStatsCollector);
}
