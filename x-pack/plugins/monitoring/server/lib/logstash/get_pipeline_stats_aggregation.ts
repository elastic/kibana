/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest, PipelineVersion } from '../../types';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { Globals } from '../../static_globals';

function scalarCounterAggregation(
  field: string,
  fieldPath: string,
  ephemeralIdField: string,
  maxBucketSize: number
) {
  const fullPath = `${fieldPath}.${field}`;

  const byEphemeralIdName = `${field}_temp_by_ephemeral_id`;
  const sumName = `${field}_total`;

  const aggs: { [key: string]: any } = {};

  aggs[byEphemeralIdName] = {
    terms: {
      field: ephemeralIdField,
      size: maxBucketSize,
    },
    aggs: {
      stats: {
        stats: { field: fullPath },
      },
      difference: {
        bucket_script: {
          script: 'params.max - params.min',
          buckets_path: {
            min: 'stats.min',
            max: 'stats.max',
          },
        },
      },
    },
  };

  aggs[sumName] = {
    sum_bucket: {
      buckets_path: `${byEphemeralIdName}>difference`,
    },
  };

  return aggs;
}

function nestedVertices(statsPath: string, maxBucketSize: number) {
  const fieldPath = `${statsPath}.pipelines.vertices`;
  const ephemeralIdField = `${statsPath}.pipelines.vertices.pipeline_ephemeral_id`;

  return {
    nested: { path: `${statsPath}.pipelines.vertices` },
    aggs: {
      vertex_id: {
        terms: {
          field: `${statsPath}.pipelines.vertices.id`,
          size: maxBucketSize,
        },
        aggs: {
          ...scalarCounterAggregation('events_in', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation('events_out', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation(
            'duration_in_millis',
            fieldPath,
            ephemeralIdField,
            maxBucketSize
          ),
        },
      },
    },
  };
}

function createScopedAgg(pipelineId: string, pipelineHash: string, maxBucketSize: number) {
  return (statsPath: string) => {
    const verticesAgg = {
      vertices: nestedVertices(statsPath, maxBucketSize),
      total_processor_duration_stats: {
        stats: {
          field: `${statsPath}.pipelines.events.duration_in_millis`,
        },
      },
    };

    return {
      nested: { path: `${statsPath}.pipelines` },
      aggs: {
        scoped: {
          filter: {
            bool: {
              filter: [
                { term: { [`${statsPath}.pipelines.id`]: pipelineId } },
                { term: { [`${statsPath}.pipelines.hash`]: pipelineHash } },
              ],
            },
          },
          aggs: verticesAgg,
        },
      },
    };
  };
}

function fetchPipelineLatestStats(
  query: object,
  pipelineId: string,
  version: PipelineVersion,
  maxBucketSize: number,
  callWithRequest: any,
  req: LegacyRequest
) {
  const dataset = 'node_stats';
  const moduleType = 'logstash';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });
  const pipelineAggregation = createScopedAgg(pipelineId, version.hash, maxBucketSize);
  const params = {
    index: indexPatterns,
    size: 0,
    ignore_unavailable: true,
    filter_path: [
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.key',
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.events_in_total',
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.events_out_total',
      'aggregations.pipelines.scoped.vertices.vertex_id.buckets.duration_in_millis_total',
      'aggregations.pipelines.scoped.total_processor_duration_stats',
      'aggregations.pipelines_mb.scoped.vertices.vertex_id.buckets.key',
      'aggregations.pipelines_mb.scoped.vertices.vertex_id.buckets.events_in_total',
      'aggregations.pipelines_mb.scoped.vertices.vertex_id.buckets.events_out_total',
      'aggregations.pipelines_mb.scoped.vertices.vertex_id.buckets.duration_in_millis_total',
      'aggregations.pipelines_mb.scoped.total_processor_duration_stats',
    ],
    body: {
      query,
      aggs: {
        pipelines: pipelineAggregation('logstash_stats'),
        pipelines_mb: pipelineAggregation('logstash.node.stats'),
      },
    },
  };

  return callWithRequest(req, 'search', params);
}

export function getPipelineStatsAggregation({
  req,
  timeseriesInterval,
  clusterUuid,
  pipelineId,
  version,
}: {
  req: LegacyRequest;
  timeseriesInterval: number;
  clusterUuid: string;
  pipelineId: string;
  version: PipelineVersion;
}) {
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

  const start = version.lastSeen - timeseriesInterval * 1000;
  const end = version.lastSeen;

  const dataset = 'node_stats';
  const type = 'logstash_stats';
  const moduleType = 'logstash';

  const query = createQuery({
    type,
    dsDataset: `${moduleType}.${dataset}`,
    metricset: dataset,
    start,
    end,
    metric: LogstashMetric.getMetricFields(),
    clusterUuid,
    filters,
  });

  const config = req.server.config;

  return fetchPipelineLatestStats(
    query,
    pipelineId,
    version,
    config.ui.max_bucket_size,
    callWithRequest,
    req
  );
}
