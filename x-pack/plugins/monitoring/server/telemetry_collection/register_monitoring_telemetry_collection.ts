/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient } from 'kibana/server';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type { UsageStatsPayload } from '../../../../../src/plugins/telemetry_collection_manager/server';
import type { LogstashBaseStats } from './get_logstash_stats';
import type { BeatsBaseStats } from './get_beats_stats';
import { getAllStats } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';
import { getLicenses } from './get_licenses';

interface MonitoringStats extends Omit<UsageStatsPayload, 'cacheDetails'> {
  stack_stats: {
    logstash?: LogstashBaseStats;
    beats?: BeatsBaseStats;
    // Intentionally not declaring "kibana" to avoid repetition with "local" telemetry,
    // and since it should only report it for old versions reporting "too much" monitoring data
    // [KIBANA_SYSTEM_ID]?: KibanaClusterStat;
  };
}

// We need to nest it under a property because fetch must return an object (the schema mandates that)
interface MonitoringTelemetryUsage {
  stats: MonitoringStats[];
}

export function registerMonitoringTelemetryCollection(
  usageCollection: UsageCollectionSetup,
  getClient: () => IClusterClient,
  maxBucketSize: number
) {
  const monitoringStatsCollector = usageCollection.makeStatsCollector<MonitoringTelemetryUsage>({
    type: 'monitoringTelemetry',
    isReady: () => true,
    schema: {
      stats: {
        type: 'array',
        items: {
          timestamp: { type: 'date' },
          cluster_uuid: { type: 'keyword' },
          cluster_name: { type: 'keyword' },
          version: { type: 'keyword' },
          cluster_stats: {},
          stack_stats: {
            logstash: {
              versions: {
                type: 'array',
                items: {
                  version: { type: 'keyword' },
                  count: { type: 'long' },
                },
              },
              count: { type: 'long' },
              cluster_stats: {
                collection_types: {
                  DYNAMIC_KEY: { type: 'long' },
                },
                queues: {
                  DYNAMIC_KEY: { type: 'long' },
                },
                plugins: {
                  type: 'array',
                  items: {
                    name: { type: 'keyword' },
                    count: { type: 'long' },
                  },
                },
                pipelines: {
                  count: { type: 'long' },
                  batch_size_max: { type: 'long' },
                  batch_size_avg: { type: 'long' },
                  batch_size_min: { type: 'long' },
                  batch_size_total: { type: 'long' },
                  workers_max: { type: 'long' },
                  workers_avg: { type: 'long' },
                  workers_min: { type: 'long' },
                  workers_total: { type: 'long' },
                  sources: {
                    DYNAMIC_KEY: { type: 'boolean' },
                  },
                },
              },
            },
            beats: {
              versions: { DYNAMIC_KEY: { type: 'long' } },
              types: { DYNAMIC_KEY: { type: 'long' } },
              outputs: { DYNAMIC_KEY: { type: 'long' } },
              queue: { DYNAMIC_KEY: { type: 'long' } },
              count: { type: 'long' },
              eventsPublished: { type: 'long' },
              hosts: { type: 'long' },
              input: {
                count: { type: 'long' },
                names: { type: 'array', items: { type: 'keyword' } },
              },
              module: {
                count: { type: 'long' },
                names: { type: 'array', items: { type: 'keyword' } },
              },
              architecture: {
                count: { type: 'long' },
                architectures: {
                  type: 'array',
                  items: {
                    name: { type: 'keyword' },
                    architecture: { type: 'keyword' },
                    count: { type: 'long' },
                  },
                },
              },
              heartbeat: {
                monitors: { type: 'long' },
                endpoints: { type: 'long' },
                DYNAMIC_KEY: {
                  monitors: { type: 'long' },
                  endpoints: { type: 'long' },
                },
              },
              functionbeat: {
                functions: {
                  count: { type: 'long' },
                },
              },
            },
          },
          collection: { type: 'keyword' },
          collectionSource: { type: 'keyword' },
        },
      },
    },
    fetch: async () => {
      const timestamp = Date.now(); // Collect the telemetry from the monitoring indices for this moment.
      // NOTE: Usually, the monitoring indices index stats for each product every 10s (by default).
      // However, some data may be delayed up-to 24h because monitoring only collects extended Kibana stats in that interval
      // to avoid overloading of the system when retrieving data from the collectors (that delay is dealt with in the Kibana Stats getter inside the `getAllStats` method).
      // By 8.x, we expect to stop collecting the Kibana extended stats and keep only the monitoring-related metrics.
      const callCluster = getClient().asInternalUser;
      const clusterDetails = await getClusterUuids(callCluster, timestamp, maxBucketSize);
      const [licenses, stats] = await Promise.all([
        getLicenses(clusterDetails, callCluster, timestamp, maxBucketSize),
        getAllStats(clusterDetails, callCluster, timestamp, maxBucketSize),
      ]);

      return {
        stats: stats.map((stat) => {
          const license = licenses[stat.cluster_uuid];
          return {
            ...(license ? { license } : {}),
            ...stat,
            collectionSource: 'monitoring',
          };
        }),
      };
    },
  });
  usageCollection.registerCollector(monitoringStatsCollector);
}
