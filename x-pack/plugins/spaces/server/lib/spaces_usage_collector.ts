/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { CallAPIOptions } from 'src/core/server';
import { take } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
// @ts-ignore
import { KIBANA_STATS_TYPE_MONITORING } from '../../../../legacy/plugins/monitoring/common/constants';
import { KIBANA_SPACES_STATS_TYPE } from '../../common/constants';
import { PluginsSetup } from '../plugin';

type CallCluster = <T = unknown>(
  endpoint: string,
  clientParams: Record<string, unknown>,
  options?: CallAPIOptions
) => Promise<T>;

interface SpacesAggregationResponse {
  hits: {
    total: { value: number };
  };
  aggregations: {
    [aggName: string]: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

/**
 *
 * @param {CallCluster} callCluster
 * @param {string} kibanaIndex
 * @param {PluginsSetup['features']} features
 * @param {boolean} spacesAvailable
 * @return {UsageStats}
 */
async function getSpacesUsage(
  callCluster: CallCluster,
  kibanaIndex: string,
  features: PluginsSetup['features'],
  spacesAvailable: boolean
) {
  if (!spacesAvailable) {
    return {} as UsageStats;
  }

  const knownFeatureIds = features.getFeatures().map(feature => feature.id);

  const resp = await callCluster<SpacesAggregationResponse>('search', {
    index: kibanaIndex,
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

interface CollectorDeps {
  kibanaIndex: string;
  features: PluginsSetup['features'];
  licensing: PluginsSetup['licensing'];
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(
  usageCollection: UsageCollectionSetup,
  deps: CollectorDeps
) {
  return usageCollection.makeUsageCollector({
    type: KIBANA_SPACES_STATS_TYPE,
    isReady: () => true,
    fetch: async (callCluster: CallCluster) => {
      const license = await deps.licensing.license$.pipe(take(1)).toPromise();
      const available = license.isAvailable; // some form of spaces is available for all valid licenses

      const usageStats = await getSpacesUsage(
        callCluster,
        deps.kibanaIndex,
        deps.features,
        available
      );

      return {
        available,
        enabled: available,
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

export function registerSpacesUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  deps: CollectorDeps
) {
  if (!usageCollection) {
    return;
  }
  const collector = getSpacesUsageCollector(usageCollection, deps);
  usageCollection.registerCollector(collector);
}
