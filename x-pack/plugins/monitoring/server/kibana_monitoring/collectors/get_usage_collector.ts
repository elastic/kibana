/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SavedObjectsClient } from 'src/core/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { MonitoringConfig } from '../../config';
import { fetchAvailableCcs } from '../../lib/alerts/fetch_available_ccs';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { fetchLicenseType } from './lib/fetch_license_type';
import { MonitoringUsage, StackProductUsage } from './types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';
import { getCcsIndexPattern } from '../../lib/alerts/get_ccs_index_pattern';
import { fetchClusters } from '../../lib/alerts/fetch_clusters';
import { pickCluster } from './lib/pick_cluster';

export function getMonitoringUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  callCluster: CallCluster,
  getSavedObjectClient: () => Promise<SavedObjectsClient>
) {
  return usageCollection.makeUsageCollector<MonitoringUsage>({
    type: 'monitoring',
    isReady: () => true,
    schema: {
      hasMonitoringData: {
        type: 'boolean',
      },
      license: {
        type: 'keyword',
      },
      clusterUuid: {
        type: 'keyword',
      },
      allClusterUuids: {
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
    fetch: async () => {
      const savedObjectsClient = await getSavedObjectClient();
      const availableCcs = config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : [];
      const elasticsearchIndex = getCcsIndexPattern(INDEX_PATTERN_ELASTICSEARCH, availableCcs);
      const clusters = await fetchClusters(callCluster, elasticsearchIndex);
      const cluster = await pickCluster(clusters, savedObjectsClient);
      const license = await fetchLicenseType(callCluster, availableCcs, cluster.clusterUuid);
      const stackProducts = await getStackProductsUsage(
        config,
        callCluster,
        availableCcs,
        cluster.clusterUuid
      );

      const hasMonitoringData = Object.values(stackProducts).reduce(
        (accum: boolean, usage: StackProductUsage) => {
          return accum || usage.enabled;
        },
        false
      );

      const usage: MonitoringUsage = {
        hasMonitoringData,
        clusterUuid: cluster.clusterUuid,
        allClusterUuids: clusters.map((_cluster) => _cluster.clusterUuid),
        license,
        metricbeatUsed: Object.values(stackProducts).some(
          (_usage: StackProductUsage) => _usage.metricbeatUsed
        ),
        ...stackProducts,
      };

      return usage;
    },
  });
}
