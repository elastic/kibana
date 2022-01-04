/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, orderBy } from 'lodash';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { checkParam } from '../error_missing_required';
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
  lsIndexPattern,
  clusterUuid,
  pipelineId,
}: {
  req: LegacyRequest;
  lsIndexPattern: string;
  clusterUuid: string;
  pipelineId: string;
}) {
  const config = req.server.config();
  checkParam(lsIndexPattern, 'logstashIndexPattern in getPipelineVersions');
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
    types: ['node_stats', 'logstash_stats'],
    metric: LogstashMetric.getMetricFields(),
    clusterUuid,
    filters,
  });

  const pipelineAggregation = createScopedAgg(
    pipelineId,
    Number(config.get('monitoring.ui.max_bucket_size'))
  );
  const aggs = {
    pipelines: pipelineAggregation('logstash_stats'),
    pipelines_mb: pipelineAggregation('logstash.node.stats'),
  };

  const params = {
    index: lsIndexPattern,
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
  lsIndexPattern: string;
  clusterUuid: string;
  pipelineId: string;
}) {
  const response = await fetchPipelineVersions(args);
  return _handleResponse(response);
}
