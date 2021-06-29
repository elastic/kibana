/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ILegacyClusterClient } from 'src/core/server';
import { MonitoringConfig } from '../../config';
import { fetchAvailableCcsLegacy } from '../../lib/alerts/fetch_available_ccs';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { fetchLicenseType } from './lib/fetch_license_type';
import { MonitoringUsage, StackProductUsage, MonitoringClusterStackProductUsage } from './types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';
import { getCcsIndexPattern } from '../../lib/alerts/get_ccs_index_pattern';
import { fetchClustersLegacy } from '../../lib/alerts/fetch_clusters';

export function getMonitoringUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  legacyEsClient: ILegacyClusterClient
) {
  return usageCollection.makeUsageCollector<MonitoringUsage, true>({
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
        ? legacyEsClient.asScoped(kibanaRequest).callAsCurrentUser
        : legacyEsClient.callAsInternalUser;
      const usageClusters: MonitoringClusterStackProductUsage[] = [];
      const availableCcs = config.ui.ccs.enabled ? await fetchAvailableCcsLegacy(callCluster) : [];
      const elasticsearchIndex = getCcsIndexPattern(INDEX_PATTERN_ELASTICSEARCH, availableCcs);
      const clusters = await fetchClustersLegacy(callCluster, elasticsearchIndex);
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
