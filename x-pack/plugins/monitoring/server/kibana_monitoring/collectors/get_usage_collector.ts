/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ILegacyClusterClient } from 'src/core/server';
import { MonitoringConfig } from '../../config';
import { fetchAvailableCcs } from '../../lib/alerts/fetch_available_ccs';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { fetchLicenseType } from './lib/fetch_license_type';
import { MonitoringUsage, StackProductUsage, MonitoringClusterStackProductUsage } from './types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';
import { getCcsIndexPattern } from '../../lib/alerts/get_ccs_index_pattern';
import { fetchClusters } from '../../lib/alerts/fetch_clusters';

export function getMonitoringUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  esClient: ILegacyClusterClient
) {
  return usageCollection.makeUsageCollector<MonitoringUsage, unknown, true>({
    type: 'monitoring',
    isReady: () => true,
    schema: {
      hasMonitoringData: {
        type: 'boolean',
      },
      clusters: {
        type: 'array',
        items: {
          license: {
            type: 'keyword',
          },
          clusterUuid: {
            type: 'keyword',
          },
          metricbeatUsed: {
            type: 'boolean',
          },
          elasticsearch: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          kibana: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          logstash: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          beats: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
          apm: {
            enabled: {
              type: 'boolean',
            },
            count: {
              type: 'long',
            },
            metricbeatUsed: {
              type: 'boolean',
            },
          },
        },
      },
    },
    extendFetchContext: {
      kibanaRequest: true,
    },
    fetch: async ({ kibanaRequest }) => {
      const callCluster = kibanaRequest
        ? esClient.asScoped(kibanaRequest).callAsCurrentUser
        : esClient.callAsInternalUser;
      const usageClusters: MonitoringClusterStackProductUsage[] = [];
      const availableCcs = config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : [];
      const elasticsearchIndex = getCcsIndexPattern(INDEX_PATTERN_ELASTICSEARCH, availableCcs);
      const clusters = await fetchClusters(callCluster, elasticsearchIndex);
      for (const cluster of clusters) {
        const license = await fetchLicenseType(callCluster, availableCcs, cluster.clusterUuid);
        const stackProducts = await getStackProductsUsage(
          config,
          callCluster,
          availableCcs,
          cluster.clusterUuid
        );
        usageClusters.push({
          clusterUuid: cluster.clusterUuid,
          license,
          metricbeatUsed: Object.values(stackProducts).some(
            (_usage: StackProductUsage) => _usage.metricbeatUsed
          ),
          ...stackProducts,
        });
      }

      const usage = {
        hasMonitoringData: usageClusters.length > 0,
        clusters: usageClusters,
      };

      return usage;
    },
  });
}
