/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import {
  ClusterDetailsGetter,
  StatsCollectionConfig,
  ClusterDetails,
} from 'src/plugins/telemetry_collection_manager/server';
import { createQuery } from './create_query';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  CLUSTER_DETAILS_FETCH_INTERVAL,
} from '../../common/constants';
import { CustomContext } from './get_all_stats';
/**
 * Get a list of Cluster UUIDs that exist within the specified timespan.
 */
export const getClusterUuids: ClusterDetailsGetter<CustomContext> = async (
  config,
  { maxBucketSize }
) => {
  const response = await fetchClusterUuids(config, maxBucketSize);
  return handleClusterUuidsResponse(response);
};

/**
 * Fetch the aggregated Cluster UUIDs from the monitoring cluster.
 */
export async function fetchClusterUuids(
  { callCluster, timestamp }: StatsCollectionConfig,
  maxBucketSize: number
) {
  const start = moment(timestamp).subtract(CLUSTER_DETAILS_FETCH_INTERVAL, 'ms').toISOString();

  const end = moment(timestamp).toISOString();

  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    size: 0,
    ignoreUnavailable: true,
    filterPath: 'aggregations.cluster_uuids.buckets.key',
    body: {
      query: createQuery({ type: 'cluster_stats', start, end }),
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

  return await callCluster('search', params);
}

/**
 * Convert the aggregation response into an array of Cluster UUIDs.
 *
 * @param {Object} response The aggregation response
 * @return {Array} Strings; each representing a Cluster's UUID.
 */
export function handleClusterUuidsResponse(response: any): ClusterDetails[] {
  const uuidBuckets: any[] = get(response, 'aggregations.cluster_uuids.buckets', []);

  return uuidBuckets.map((uuidBucket) => ({
    clusterUuid: uuidBucket.key as string,
  }));
}
