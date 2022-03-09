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
import { LegacyRequest } from '../../../types';
import { ElasticsearchModifiedSource } from '../../../../common/types/es';
import { getNewIndexPatterns } from '../../cluster/get_index_patterns';
import { Globals } from '../../../static_globals';

async function getShardCountPerNode(req: LegacyRequest, cluster: ElasticsearchModifiedSource) {
  const config = req.server.config;
  const maxBucketSize = config.ui.max_bucket_size;
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
  const dataset = 'shard'; // data_stream.dataset
  const type = 'shards'; // legacy
  const moduleType = 'elasticsearch';
  const indexPattern = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });

  const params = {
    index: indexPattern,
    size: 0,
    ignore_unavailable: true,
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        clusterUuid: cluster.cluster_uuid ?? cluster.elasticsearch?.cluster?.id,
        metric,
        filters,
      }),
      aggs: {
        nodes: {
          terms: {
            field: 'shard.node',
            size: maxBucketSize,
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return await callWithRequest(req, 'search', params);
}

export async function getNodesShardCount(req: LegacyRequest, cluster: ElasticsearchModifiedSource) {
  const response = await getShardCountPerNode(req, cluster);
  const nodes = get(response, 'aggregations.nodes.buckets', []).reduce(
    (accum: any, bucket: any) => {
      accum[bucket.key] = { shardCount: bucket.doc_count };
      return accum;
    },
    {}
  );
  return { nodes };
}
