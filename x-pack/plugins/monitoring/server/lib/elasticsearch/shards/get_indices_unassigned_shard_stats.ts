/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
// @ts-ignore
import { checkParam } from '../../error_missing_required';
// @ts-ignore
import { createQuery } from '../../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../../metrics';
// @ts-ignore
import { calculateIndicesTotals } from './calculate_shard_stat_indices_totals';
import { LegacyRequest } from '../../../types';
import { ElasticsearchModifiedSource } from '../../../../common/types/es';

async function getUnassignedShardData(
  req: LegacyRequest,
  esIndexPattern: string,
  cluster: ElasticsearchModifiedSource
) {
  const config = req.server.config();
  const maxBucketSize = config.get('monitoring.ui.max_bucket_size');
  const metric = ElasticsearchMetric.getMetricFields();

  const filters = [];
  if (cluster.cluster_state?.state_uuid) {
    filters.push({ term: { state_uuid: cluster.cluster_state?.state_uuid } });
  } else if (cluster.elasticsearch?.cluster?.stats?.state?.state_uuid) {
    filters.push({
      term: {
        'elasticsearch.cluster.stats.state.state_uuid':
          cluster.elasticsearch?.cluster?.stats?.state?.state_uuid,
      },
    });
  }

  const params = {
    index: esIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        types: ['shard', 'shards'],
        clusterUuid: cluster.cluster_uuid ?? cluster.elasticsearch?.cluster?.id,
        metric,
        filters,
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

export async function getIndicesUnassignedShardStats(
  req: LegacyRequest,
  esIndexPattern: string,
  cluster: ElasticsearchModifiedSource
) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getShardStats');

  const response = await getUnassignedShardData(req, esIndexPattern, cluster);
  const indices = get(response, 'aggregations.indices.buckets', []).reduce(
    (accum: any, bucket: any) => {
      const index = bucket.key;
      const states = get(bucket, 'state.primary.buckets', []);
      const unassignedReplica = states
        .filter((state: any) => state.key_as_string === 'false')
        .reduce((total: number, state: any) => total + state.doc_count, 0);
      const unassignedPrimary = states
        .filter((state: any) => state.key_as_string === 'true')
        .reduce((total: number, state: any) => total + state.doc_count, 0);

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
    },
    {}
  );

  const indicesTotals = calculateIndicesTotals(indices);
  return { indices, indicesTotals };
}
