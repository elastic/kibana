/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import moment from 'moment';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';

/**
 * Get statistics for all selected Elasticsearch clusters.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids The string Cluster UUIDs to fetch details for
 */
export async function getElasticsearchStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string,
  maxBucketSize: number
) {
  const response = await fetchElasticsearchStats(
    callCluster,
    clusterUuids,
    start,
    end,
    maxBucketSize
  );
  return handleElasticsearchStats(response);
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
export async function fetchElasticsearchStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string,
  maxBucketSize: number
) {
  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: maxBucketSize,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.timestamp',
      'hits.hits._source.cluster_name',
      'hits.hits._source.version',
      'hits.hits._source.cluster_stats',
      'hits.hits._source.stack_stats',
    ],
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
                  gte: moment.utc(start).valueOf(),
                  lte: moment.utc(end).valueOf(),
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

  return await callCluster.search<ESClusterStats>(params);
}

export interface ESClusterStats {
  cluster_uuid: string;
  cluster_name: string;
  timestamp: string;
  version: string;
  cluster_stats: object;
  stack_stats?: object;
}

/**
 * Extract the cluster stats for each cluster.
 */
export function handleElasticsearchStats(response: estypes.SearchResponse<ESClusterStats>) {
  const clusters = response.hits?.hits || [];

  return clusters.map((cluster) => cluster._source!);
}
