/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { LegacyRequest } from '../../types';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

function fetchPipelineVersions({
  req,
  clusterUuid,
  pipelineId,
}: {
  req: LegacyRequest;
  clusterUuid: string;
  pipelineId: string;
}) {
  const dataset = 'node_stats';
  const type = 'logstash_stats';
  const moduleType = 'logstash';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });
  const config = req.server.config();
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const filters = [
    {
      nested: {
        path: 'logstash_stats.pipelines',
        query: {
          bool: {
            filter: [{ term: { 'logstash_stats.pipelines.id': pipelineId } }],
          },
        },
      },
    },
  ];
  const query = createQuery({
    type,
    dsDataset: `${moduleType}.${dataset}`,
    metricset: dataset,
    metric: LogstashMetric.getMetricFields(),
    clusterUuid,
    filters,
  });

  const filteredAggs = {
    by_pipeline_hash: {
      terms: {
        field: 'logstash_stats.pipelines.hash',
        size: config.get('monitoring.ui.max_bucket_size'),
        order: { 'path_to_root>first_seen': 'desc' },
      },
      aggs: {
        path_to_root: {
          reverse_nested: {},
          aggs: {
            first_seen: {
              min: {
                field: 'logstash_stats.timestamp',
              },
            },
            last_seen: {
              max: {
                field: 'logstash_stats.timestamp',
              },
            },
          },
        },
      },
    },
  };

  const aggs = {
    pipelines: {
      nested: {
        path: 'logstash_stats.pipelines',
      },
      aggs: {
        scoped: {
          filter: {
            bool: {
              filter: [{ term: { 'logstash_stats.pipelines.id': pipelineId } }],
            },
          },
          aggs: filteredAggs,
        },
      },
    },
  };

  const params = {
    index: indexPatterns,
    size: 0,
    ignore_unavailable: true,
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query,
      aggs,
    },
  };

  return callWithRequest(req, 'search', params);
}

export function _handleResponse(response: any) {
  const pipelineHashes = get(
    response,
    'aggregations.pipelines.scoped.by_pipeline_hash.buckets',
    []
  );
  return pipelineHashes.map((pipelineHash: any) => ({
    hash: pipelineHash.key,
    firstSeen: get(pipelineHash, 'path_to_root.first_seen.value'),
    lastSeen: get(pipelineHash, 'path_to_root.last_seen.value'),
  }));
}

export async function getPipelineVersions(args: {
  req: LegacyRequest;
  clusterUuid: string;
  pipelineId: string;
}) {
  const response = await fetchPipelineVersions(args);
  return _handleResponse(response);
}
