/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { UsageStatsPayload } from 'src/plugins/telemetry_collection_manager/server';
import { CollectorOptions, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getAllStats } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';
import { getLicenses } from './get_licenses';

interface MonitoringCollectorOptions<T, U = unknown> extends CollectorOptions<T, U> {
  ignoreForInternalUploader: boolean; // Allow the additional property required by bulk_uploader to be filtered out
}

export function registerMonitoringTelemetryCollection(
  usageCollection: UsageCollectionSetup,
  callCluster: LegacyAPICaller,
  maxBucketSize: number
) {
  const monitoringStatsCollector = usageCollection.makeStatsCollector<
    UsageStatsPayload[],
    unknown,
    MonitoringCollectorOptions<UsageStatsPayload[]>
  >({
    type: 'monitoringTelemetry',
    isReady: () => true,
    ignoreForInternalUploader: true, // Used only by monitoring's bulk_uploader to filter out unwanted collectors
    fetch: async () => {
      const timestamp = Date.now(); // Collect the telemetry from the monitoring indices for this moment.
      // NOTE: Usually, the monitoring indices index stats for each product every 10s (by default).
      // However, some data may be delayed up-to 24h because monitoring only collects extended Kibana stats in that interval
      // to avoid overloading of the system when retrieving data from the collectors (that delay is dealt with in the Kibana Stats getter inside the `getAllStats` method).
      // By 8.x, we expect to stop collecting the Kibana extended stats and keep only the monitoring-related metrics.
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
