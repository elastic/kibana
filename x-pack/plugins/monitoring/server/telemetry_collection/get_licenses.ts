/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from 'elasticsearch';
import { ElasticsearchClient } from 'kibana/server';
import { estypes } from '@elastic/elasticsearch';
import { ESLicense } from '../../../telemetry_collection_xpack/server';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';

/**
 * Get statistics for all selected Elasticsearch clusters.
 */
export async function getLicenses(
  clusterUuids: string[],
  callCluster: ElasticsearchClient, // TODO: To be changed to the new ES client when the plugin migrates
  maxBucketSize: number
): Promise<{ [clusterUuid: string]: ESLicense | undefined }> {
  const response = await fetchLicenses(callCluster, clusterUuids, maxBucketSize);
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
          ],
        },
      },
      collapse: { field: 'cluster_uuid' },
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
    },
  };

  const { body: response } = await callCluster.search(params);
  return response as SearchResponse<ESClusterStatsWithLicense>;
}

export interface ESClusterStatsWithLicense {
  cluster_uuid: string;
  type: 'cluster_stats';
  license?: ESLicense;
}

/**
 * Extract the cluster stats for each cluster.
 */
export function handleLicenses(response: SearchResponse<ESClusterStatsWithLicense>) {
  const clusters = response.hits?.hits || [];

  return clusters.reduce(
    (acc, { _source }) => ({
      ...acc,
      [_source.cluster_uuid]: _source.license,
    }),
    {}
  );
}
