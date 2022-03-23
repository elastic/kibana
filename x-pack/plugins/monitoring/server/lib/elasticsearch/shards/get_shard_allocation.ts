/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { StringOptions } from '@kbn/config-schema/target_types/types';
// @ts-ignore
import { createQuery } from '../../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../../metrics';
import { ElasticsearchResponse, ElasticsearchLegacySource } from '../../../../common/types/es';
import { LegacyRequest } from '../../../types';
import { getNewIndexPatterns } from '../../cluster/get_index_patterns';
import { Globals } from '../../../static_globals';

export function handleResponse(response: ElasticsearchResponse) {
  const hits = response.hits?.hits;
  if (!hits) {
    return [];
  }

  // deduplicate any shards from earlier days with the same cluster state state_uuid
  const uniqueShards = new Set<string>();

  // map into object with shard and source propertiesd
  return hits.reduce((shards: Array<ElasticsearchLegacySource['shard']>, hit) => {
    const legacyShard = hit._source.shard;
    const mbShard = hit._source.elasticsearch;

    if (legacyShard || mbShard) {
      const index = mbShard?.index?.name ?? legacyShard?.index;
      const shardNumber = mbShard?.shard?.number ?? legacyShard?.shard;
      const primary = mbShard?.shard?.primary ?? legacyShard?.primary;
      const relocatingNode =
        mbShard?.shard?.relocating_node?.id ?? legacyShard?.relocating_node ?? null;
      const node = mbShard?.node?.id ?? legacyShard?.node;
      // note: if the request is for a node, then it's enough to deduplicate without primary, but for indices it displays both
      const shardId = `${index}-${shardNumber}-${primary}-${relocatingNode}-${node}`;

      if (!uniqueShards.has(shardId)) {
        // @ts-ignore
        shards.push({
          index,
          node,
          primary,
          relocating_node: relocatingNode,
          shard: shardNumber,
          state: legacyShard?.state ?? mbShard?.shard?.state,
        });
        uniqueShards.add(shardId);
      }
    }

    return shards;
  }, []);
}

export function getShardAllocation(
  req: LegacyRequest,
  {
    shardFilter,
    stateUuid,
    showSystemIndices = false,
  }: { shardFilter: any; stateUuid: string; showSystemIndices: boolean }
) {
  const filters = [
    {
      bool: {
        should: [
          {
            term: {
              state_uuid: stateUuid,
            },
          },
          {
            term: {
              'elasticsearch.cluster.stats.state.state_uuid': stateUuid,
            },
          },
        ],
      },
    },
    shardFilter,
  ];

  if (!showSystemIndices) {
    filters.push({
      bool: {
        must_not: [
          { prefix: { 'shard.index': '.' } },
          { prefix: { 'elasticsearch.index.name': '.' } },
        ],
      },
    });
  }

  const config = req.server.config;
  const clusterUuid = req.params.clusterUuid;
  const metric = ElasticsearchMetric.getMetricFields();

  const dataset = 'shard'; // data_stream.dataset
  const type = 'shards'; // legacy
  const moduleType = 'elasticsearch';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    dataset,
    moduleType,
  });

  const params = {
    index: indexPatterns,
    size: config.ui.max_bucket_size,
    ignore_unavailable: true,
    body: {
      query: createQuery({
        type,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        clusterUuid,
        metric,
        filters,
      }),
    },
  };
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
