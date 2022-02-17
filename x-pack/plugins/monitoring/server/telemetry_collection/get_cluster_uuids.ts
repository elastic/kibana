/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import moment from 'moment';
import { ElasticsearchClient } from 'kibana/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createQuery } from './create_query';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  CLUSTER_DETAILS_FETCH_INTERVAL,
} from '../../common/constants';

/**
 * Get a list of Cluster UUIDs that exist within the specified timespan.
 */
export async function getClusterUuids(
  callCluster: ElasticsearchClient,
  timestamp: number,
  maxBucketSize: number
) {
  const response = await fetchClusterUuids(callCluster, timestamp, maxBucketSize);
  return handleClusterUuidsResponse(response);
}

/**
 * Fetch the aggregated Cluster UUIDs from the monitoring cluster.
 */
export async function fetchClusterUuids(
  callCluster: ElasticsearchClient,
  timestamp: number,
  maxBucketSize: number
) {
  const start = moment(timestamp).subtract(CLUSTER_DETAILS_FETCH_INTERVAL, 'ms').toISOString();

  const end = moment(timestamp).toISOString();

  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: 0,
    ignore_unavailable: true,
    filter_path: 'aggregations.cluster_uuids.buckets.key',
    body: {
      query: createQuery({ type: 'cluster_stats', start, end }) as estypes.QueryDslQueryContainer,
      aggs: {
        cluster_uuids: {
          terms: {
            field: 'cluster_uuid',
            size: maxBucketSize,
          },
        },
      },
    },
  };

  return await callCluster.search(params);
}

/**
 * Convert the aggregation response into an array of Cluster UUIDs.
 *
 * @param {Object} response The aggregation response
 * @return {Array} Strings; each representing a Cluster's UUID.
 */
export function handleClusterUuidsResponse(response: any): string[] {
  const uuidBuckets: any[] = get(response, 'aggregations.cluster_uuids.buckets', []);
  return uuidBuckets.map((uuidBucket) => uuidBucket.key);
}
