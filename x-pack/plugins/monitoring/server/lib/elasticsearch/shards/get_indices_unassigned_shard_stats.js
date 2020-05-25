/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { createQuery } from '../../create_query';
import { ElasticsearchMetric } from '../../metrics';
import { calculateIndicesTotals } from './calculate_shard_stat_indices_totals';

async function getUnassignedShardData(req, esIndexPattern, cluster) {
  const config = req.server.config();
  const maxBucketSize = config.get('monitoring.ui.max_bucket_size');
  const metric = ElasticsearchMetric.getMetricFields();

  const params = {
    index: esIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({
        type: 'shards',
        clusterUuid: cluster.cluster_uuid,
        metric,
        filters: [{ term: { state_uuid: get(cluster, 'cluster_state.state_uuid') } }],
      }),
      aggs: {
        indices: {
          terms: {
            field: 'shard.index',
            size: maxBucketSize,
          },
          aggs: {
            state: {
              filter: {
                terms: {
                  'shard.state': ['UNASSIGNED', 'INITIALIZING'],
                },
              },
              aggs: {
                primary: {
                  terms: {
                    field: 'shard.primary',
                    size: 2,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return await callWithRequest(req, 'search', params);
}

export async function getIndicesUnassignedShardStats(req, esIndexPattern, cluster) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getShardStats');

  const response = await getUnassignedShardData(req, esIndexPattern, cluster);
  const indices = get(response, 'aggregations.indices.buckets', []).reduce((accum, bucket) => {
    const index = bucket.key;
    const states = get(bucket, 'state.primary.buckets', []);
    const unassignedReplica = states
      .filter((state) => state.key_as_string === 'false')
      .reduce((total, state) => total + state.doc_count, 0);
    const unassignedPrimary = states
      .filter((state) => state.key_as_string === 'true')
      .reduce((total, state) => total + state.doc_count, 0);

    let status = 'green';
    if (unassignedReplica > 0) {
      status = 'yellow';
    }
    if (unassignedPrimary > 0) {
      status = 'red';
    }

    accum[index] = {
      unassigned: { primary: unassignedPrimary, replica: unassignedReplica },
      status,
    };
    return accum;
  }, {});

  const indicesTotals = calculateIndicesTotals(indices);
  return { indices, indicesTotals };
}
