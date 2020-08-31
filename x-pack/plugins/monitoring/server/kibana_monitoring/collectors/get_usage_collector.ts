/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { MonitoringConfig } from '../../config';
import { fetchAvailableCcs } from '../../lib/alerts/fetch_available_ccs';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { fetchLicenseType } from './lib/fetch_license_type';
import { MonitoringUsage, MonitoringClusterUsage } from './types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';
import { getCcsIndexPattern } from '../../lib/alerts/get_ccs_index_pattern';
import { fetchClusters } from '../../lib/alerts/fetch_clusters';

export function getMonitoringUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  callCluster: any
) {
  return usageCollection.makeUsageCollector<Promise<MonitoringUsage>>({
    type: 'monitoring',
    isReady: () => true,
    // schema: {
    //   isEnabled: {
    //     type: 'boolean',
    //   },
    //   clusters: {
    //     type: 'nested',
    //     properties: {
    //       license: {
    //         type: 'keyword',
    //       },
    //       clusterUuid: {
    //         type: 'keyword',
    //       },
    //       stackProductCount: {
    //         type: 'long',
    //       },
    //       stackProductMbCount: {
    //         type: 'long',
    //       },
    //       stackProductMbRatio: {
    //         type: 'double',
    //       },
    //       elasticsearch: {
    //         properties: {
    //           count: {
    //             type: 'long',
    //           },
    //           mbCount: {
    //             type: 'long',
    //           },
    //           mbPercentage: {
    //             type: 'double',
    //           },
    //           versions: {
    //             type: 'keyword',
    //           },
    //         },
    //       },
    //       kibana: {
    //         properties: {
    //           count: {
    //             type: 'long',
    //           },
    //           mbCount: {
    //             type: 'long',
    //           },
    //           mbPercentage: {
    //             type: 'double',
    //           },
    //           versions: {
    //             type: 'keyword',
    //           },
    //         },
    //       },
    //       logstash: {
    //         properties: {
    //           count: {
    //             type: 'long',
    //           },
    //           mbCount: {
    //             type: 'long',
    //           },
    //           mbPercentage: {
    //             type: 'double',
    //           },
    //           versions: {
    //             type: 'keyword',
    //           },
    //         },
    //       },
    //       beats: {
    //         properties: {
    //           count: {
    //             type: 'long',
    //           },
    //           mbCount: {
    //             type: 'long',
    //           },
    //           mbPercentage: {
    //             type: 'double',
    //           },
    //           versions: {
    //             type: 'keyword',
    //           },
    //         },
    //       },
    //       apm: {
    //         properties: {
    //           count: {
    //             type: 'long',
    //           },
    //           mbCount: {
    //             type: 'long',
    //           },
    //           mbPercentage: {
    //             type: 'double',
    //           },
    //           versions: {
    //             type: 'keyword',
    //           },
    //         },
    //       },
    //     },
    //   },
    // },
    fetch: async () => {
      const usage = {
        isEnabled: config.ui.enabled,
        clusters: [] as MonitoringClusterUsage[],
      };

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

        const stackProductCount = Object.values(stackProducts).reduce(
          (spc, sp) => spc + sp.count,
          0
        );
        const stackProductMbCount = Object.values(stackProducts).reduce(
          (spc, sp) => spc + sp.mbCount,
          0
        );

        usage.clusters.push({
          clusterUuid: cluster.clusterUuid,
          license,
          stackProductCount,
          stackProductMbCount,
          stackProductMbRatio: stackProductMbCount / stackProductCount,
          ...stackProducts,
        });
      }
      return usage;
    },
  });
}
