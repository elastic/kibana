/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { get } from 'lodash';
// @ts-ignore
import { KIBANA_STATS_TYPE_MONITORING } from '../../../monitoring/common/constants';
import { KIBANA_SPACES_STATS_TYPE } from '../../common/constants';

/**
 *
 * @param callCluster
 * @param server
 * @param {boolean} spacesAvailable
 * @return {UsageStats}
 */
async function getSpacesUsage(callCluster: any, server: Server, spacesAvailable: boolean) {
  if (!spacesAvailable) {
    return {} as UsageStats;
  }

  const index = server.config().get('kibana.index');

  const knownFeatureIds = server.plugins.xpack_main.getFeatures().map(feature => feature.id);

  const resp = await callCluster('search', {
    index,
    body: {
      track_total_hits: true,
      query: {
        term: {
          type: {
            value: 'space',
          },
        },
      },
      aggs: {
        disabledFeatures: {
          terms: {
            field: 'space.disabledFeatures',
            include: knownFeatureIds,
            size: knownFeatureIds.length,
          },
        },
      },
      size: 0,
    },
  });

  const { hits, aggregations } = resp;

  const count = get(hits, 'total.value', 0);
  const disabledFeatureBuckets = get(aggregations, 'disabledFeatures.buckets', []);

  const initialCounts = knownFeatureIds.reduce(
    (acc, featureId) => ({ ...acc, [featureId]: 0 }),
    {}
  );

  const disabledFeatures: Record<string, number> = disabledFeatureBuckets.reduce(
    (acc, { key, doc_count }) => {
      return {
        ...acc,
        [key]: doc_count,
      };
    },
    initialCounts
  );

  const usesFeatureControls = Object.values(disabledFeatures).some(
    disabledSpaceCount => disabledSpaceCount > 0
  );

  return {
    count,
    usesFeatureControls,
    disabledFeatures,
  } as UsageStats;
}

export interface UsageStats {
  available: boolean;
  enabled: boolean;
  count?: number;
  usesFeatureControls?: boolean;
  disabledFeatures?: {
    [featureId: string]: number;
  };
}
/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(server: any) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_SPACES_STATS_TYPE,
    fetch: async (callCluster: any) => {
      const xpackInfo = server.plugins.xpack_main.info;
      const config = server.config();
      const available = xpackInfo && xpackInfo.isAvailable(); // some form of spaces is available for all valid licenses
      const enabled = config.get('xpack.spaces.enabled');
      const spacesAvailableAndEnabled = available && enabled;

      const usageStats = await getSpacesUsage(callCluster, server, spacesAvailableAndEnabled);

      return {
        available,
        enabled: spacesAvailableAndEnabled, // similar behavior as _xpack API in ES
        ...usageStats,
      } as UsageStats;
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.spaces namespace of the data payload
     */
    formatForBulkUpload: (result: UsageStats) => {
      return {
        type: KIBANA_STATS_TYPE_MONITORING,
        payload: {
          usage: {
            spaces: result,
          },
        },
      };
    },
  });
}
