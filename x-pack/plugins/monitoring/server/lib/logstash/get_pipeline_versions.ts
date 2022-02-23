/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, orderBy } from 'lodash';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';
import { LegacyRequest, PipelineVersion } from '../../types';
import { mergePipelineVersions } from './merge_pipeline_versions';

const createScopedAgg = (pipelineId: string, maxBucketSize: number) => {
  return (statsPath: string) => {
    const byPipelineHash = {
      by_pipeline_hash: {
        terms: {
          field: `${statsPath}.pipelines.hash`,
          size: maxBucketSize,
          order: { 'path_to_root>first_seen': 'desc' },
        },
        aggs: {
          path_to_root: {
            reverse_nested: {},
            aggs: {
              first_seen: {
                min: {
                  field: `${statsPath}.timestamp`,
                },
              },
              last_seen: {
                max: {
                  field: `${statsPath}.timestamp`,
                },
              },
            },
          },
        },
      },
    };

    return {
      nested: {
        path: `${statsPath}.pipelines`,
      },
      aggs: {
        scoped: {
          filter: {
            bool: {
              filter: [{ term: { [`${statsPath}.pipelines.id`]: pipelineId } }],
            },
          },
          aggs: byPipelineHash,
        },
      },
    };
  };
};

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
  const config = req.server.config;
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const filters = [
    {
      bool: {
        should: [
          {
            nested: {
              path: 'logstash_stats.pipelines',
              ignore_unmapped: true,
              query: {
                bool: {
                  filter: [{ term: { 'logstash_stats.pipelines.id': pipelineId } }],
                },
              },
            },
          },
          {
            nested: {
              path: 'logstash.node.stats.pipelines',
              ignore_unmapped: true,
              query: {
                bool: {
                  filter: [{ term: { 'logstash.node.stats.pipelines.id': pipelineId } }],
                },
              },
            },
          },
        ],
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

  const pipelineAggregation = createScopedAgg(pipelineId, config.ui.max_bucket_size);
  const aggs = {
    pipelines: pipelineAggregation('logstash_stats'),
    pipelines_mb: pipelineAggregation('logstash.node.stats'),
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
  const pipelines = get(response, 'aggregations.pipelines.scoped.by_pipeline_hash.buckets', []);
  const pipelinesMb = get(
    response,
    'aggregations.pipelines_mb.scoped.by_pipeline_hash.buckets',
    []
  );

  const versions = pipelines.concat(pipelinesMb).map(
    (pipelineHash: any): PipelineVersion => ({
      hash: pipelineHash.key,
      firstSeen: get(pipelineHash, 'path_to_root.first_seen.value'),
      lastSeen: get(pipelineHash, 'path_to_root.last_seen.value'),
    })
  );

  // we could have continuous data about a pipeline version spread across legacy and
  // metricbeat indices, make sure to join the start and end dates for these occurrences
  const uniqVersions = mergePipelineVersions(versions);

  return orderBy(uniqVersions, 'firstSeen', 'desc');
}

export async function getPipelineVersions(args: {
  req: LegacyRequest;
  clusterUuid: string;
  pipelineId: string;
}) {
  const response = await fetchPipelineVersions(args);
  return _handleResponse(response);
}
