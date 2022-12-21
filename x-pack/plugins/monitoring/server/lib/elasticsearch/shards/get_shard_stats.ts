/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchModifiedSource, ElasticsearchResponse } from '../../../../common/types/es';
import { Globals } from '../../../static_globals';
import { LegacyRequest } from '../../../types';
import { getIndexPatterns, getElasticsearchDataset } from '../../cluster/get_index_patterns';
import { createQuery } from '../../create_query';
import { ElasticsearchMetric } from '../../metrics';
import { calculateIndicesTotals } from './calculate_shard_stat_indices_totals';
import { getShardAggs } from './get_shard_stat_aggs';
import { normalizeIndexShards, normalizeNodeShards } from './normalize_shard_objects';

export function handleResponse(
  resp: ElasticsearchResponse,
  includeNodes: boolean,
  includeIndices: boolean,
  cluster: ElasticsearchModifiedSource
) {
  let indices;
  let indicesTotals;
  let nodes;

  const buckets = get(resp, 'aggregations.indices.buckets');
  if (buckets && buckets.length !== 0) {
    indices = buckets.reduce(normalizeIndexShards, {});
    indicesTotals = calculateIndicesTotals(indices);
  }

  if (includeNodes) {
    const masterNode = get(
      cluster,
      'elasticsearch.cluster.stats.state.master_node',
      get(cluster, 'cluster_state.master_node')
    );
    nodes = resp.aggregations?.nodes.buckets.reduce(normalizeNodeShards(masterNode), {}) ?? [];
  }

  return {
    indicesTotals,
    indices: includeIndices ? indices : undefined,
    nodes,
  };
}

export function getShardStats(
  req: LegacyRequest,
  cluster: ElasticsearchModifiedSource,
  {
    includeNodes = false,
    includeIndices = false,
    indexName = null,
    nodeUuid = null,
  }: {
    includeNodes?: boolean;
    includeIndices?: boolean;
    indexName?: string | null;
    nodeUuid?: string | null;
  } = {}
) {
  const dataset = 'shard'; // data_stream.dataset
  const type = 'shards'; // legacy
  const moduleType = 'elasticsearch';
  const indexPatterns = getIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });

  const config = req.server.config;
  const metric = ElasticsearchMetric.getMetricFields();
  const filters = [];
  if (cluster.cluster_state?.state_uuid) {
    filters.push({ term: { state_uuid: cluster.cluster_state.state_uuid } });
  } else if (cluster.elasticsearch?.cluster?.stats?.state?.state_uuid) {
    filters.push({
      term: {
        'elasticsearch.cluster.stats.state.state_uuid':
          cluster.elasticsearch.cluster.stats.state.state_uuid,
      },
    });
  }
  if (indexName) {
    filters.push({
      bool: {
        should: [
          { term: { 'shard.index': indexName } },
          { term: { 'elasticsearch.index.name': indexName } },
        ],
      },
    });
  }
  if (nodeUuid) {
    filters.push({
      bool: {
        should: [
          { term: { 'shard.node': nodeUuid } },
          { term: { 'elasticsearch.node.id': nodeUuid } },
        ],
      },
    });
  }
  const params = {
    index: indexPatterns,
    size: 0,
    ignore_unavailable: true,
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type,
        dsDataset: getElasticsearchDataset(dataset),
        metricset: dataset,
        clusterUuid: cluster.cluster_uuid ?? cluster.elasticsearch?.cluster?.id,
        metric,
        filters,
      }),
      aggs: {
        ...getShardAggs(config, includeNodes, includeIndices),
      },
    },
  };
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then((resp) => {
    return handleResponse(resp, includeNodes, includeIndices, cluster);
  });
}
