/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESLicense } from '@kbn/telemetry-collection-xpack-plugin/server';
import { INDEX_PATTERN_ELASTICSEARCH, USAGE_FETCH_INTERVAL } from '../../common/constants';

/**
 * Get statistics for all selected Elasticsearch clusters.
 */
export async function getLicenses(
  clusterUuids: string[],
  callCluster: ElasticsearchClient,
  timestamp: number,
  maxBucketSize: number
): Promise<{ [clusterUuid: string]: ESLicense | undefined }> {
  const response = await fetchLicenses(callCluster, clusterUuids, timestamp, maxBucketSize);
  return handleLicenses(response);
}

/**
 * Fetch the Elasticsearch stats.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids Cluster UUIDs to limit the request against
 *
 * Returns the response for the aggregations to fetch details for the product.
 */
export async function fetchLicenses(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  timestamp: number,
  maxBucketSize: number
) {
  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: maxBucketSize,
    ignore_unavailable: true,
    filter_path: ['hits.hits._source.cluster_uuid', 'hits.hits._source.license'],
    body: {
      query: {
        bool: {
          filter: [
            /*
             * Note: Unlike most places, we don't care about the old _type: cluster_stats because it would NOT
             * have the license in it (that used to be in the .monitoring-data-2 index in cluster_info)
             */
            { term: { type: 'cluster_stats' } },
            { terms: { cluster_uuid: clusterUuids } },
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: timestamp - USAGE_FETCH_INTERVAL,
                  lte: timestamp,
                },
              },
            },
          ],
        },
      },
      collapse: { field: 'cluster_uuid' },
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
    },
  };

  return await callCluster.search<ESClusterStatsWithLicense>(params);
}

export interface ESClusterStatsWithLicense {
  cluster_uuid: string;
  type: 'cluster_stats';
  license?: ESLicense;
}

/**
 * Extract the cluster stats for each cluster.
 */
export function handleLicenses(response: estypes.SearchResponse<ESClusterStatsWithLicense>) {
  const clusters = response.hits?.hits || [];

  return clusters.reduce(
    (acc, { _source }) => ({
      ...acc,
      [_source!.cluster_uuid]: _source!.license,
    }),
    {}
  );
}
