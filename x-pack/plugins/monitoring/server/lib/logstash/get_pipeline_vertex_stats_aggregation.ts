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

  const aggs: any = {};

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

function createAggsObjectFromAggsList(aggsList: any) {
  return aggsList.reduce((aggsSoFar: object, agg: object) => ({ ...aggsSoFar, ...agg }), {});
}

function createNestedVertexAgg(statsPath: string, vertexId: string, maxBucketSize: number) {
  const fieldPath = `${statsPath}.pipelines.vertices`;
  const ephemeralIdField = `${statsPath}.pipelines.vertices.pipeline_ephemeral_id`;

  return {
    vertices: {
      nested: { path: `${statsPath}.pipelines.vertices` },
      aggs: {
        vertex_id: {
          filter: {
            term: {
              [`${statsPath}.pipelines.vertices.id`]: vertexId,
            },
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
            ...scalarCounterAggregation(
              'queue_push_duration_in_millis',
              fieldPath,
              ephemeralIdField,
              maxBucketSize
            ),
          },
        },
      },
    },
  };
}

function createTotalProcessorDurationStatsAgg(statsPath: string) {
  return {
    total_processor_duration_stats: {
      stats: {
        field: `${statsPath}.pipelines.events.duration_in_millis`,
      },
    },
  };
}

function createScopedAgg(
  pipelineId: string,
  pipelineHash: string,
  vertexId: string,
  maxBucketSize: number
) {
  return (statsPath: string) => {
    const aggs = {
      ...createNestedVertexAgg(statsPath, vertexId, maxBucketSize),
      ...createTotalProcessorDurationStatsAgg(statsPath),
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
          aggs,
        },
      },
    };
  };
}

function createTimeSeriesAgg(timeSeriesIntervalInSeconds: number, ...aggsList: object[]) {
  return {
    timeseries: {
      date_histogram: {
        field: 'timestamp',
        fixed_interval: timeSeriesIntervalInSeconds + 's',
      },
      aggs: createAggsObjectFromAggsList(aggsList),
    },
  };
}

function fetchPipelineVertexTimeSeriesStats({
  query,
  pipelineId,
  version,
  vertexId,
  timeSeriesIntervalInSeconds,
  maxBucketSize,
  callWithRequest,
  req,
}: {
  query: object;
  pipelineId: string;
  version: PipelineVersion;
  vertexId: string;
  timeSeriesIntervalInSeconds: number;
  maxBucketSize: number;
  callWithRequest: (req: any, endpoint: string, params: any) => Promise<any>;
  req: LegacyRequest;
}) {
  const pipelineAggregation = createScopedAgg(pipelineId, version.hash, vertexId, maxBucketSize);
  const aggs = {
    ...createTimeSeriesAgg(timeSeriesIntervalInSeconds, {
      pipelines: pipelineAggregation('logstash_stats'),
      pipelines_mb: pipelineAggregation('logstash.node.stats'),
    }),
  };

  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType: 'logstash',
  });

  const params = {
    index: indexPatterns,
    size: 0,
    ignore_unavailable: true,
    filter_path: [
      'aggregations.timeseries.buckets.key',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.events_in_total',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.events_out_total',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.duration_in_millis_total',
      'aggregations.timeseries.buckets.pipelines.scoped.vertices.vertex_id.queue_push_duration_in_millis_total',
      'aggregations.timeseries.buckets.pipelines.scoped.total_processor_duration_stats',
      'aggregations.timeseries.buckets.pipelines_mb.scoped.vertices.vertex_id.events_in_total',
      'aggregations.timeseries.buckets.pipelines_mb.scoped.vertices.vertex_id.events_out_total',
      'aggregations.timeseries.buckets.pipelines_mb.scoped.vertices.vertex_id.duration_in_millis_total',
      'aggregations.timeseries.buckets.pipelines_mb.scoped.vertices.vertex_id.queue_push_duration_in_millis_total',
      'aggregations.timeseries.buckets.pipelines_mb.scoped.total_processor_duration_stats',
    ],
    body: {
      query,
      aggs,
    },
  };

  return callWithRequest(req, 'search', params);
}

export function getPipelineVertexStatsAggregation({
  req,
  timeSeriesIntervalInSeconds,
  clusterUuid,
  pipelineId,
  version,
  vertexId,
}: {
  req: LegacyRequest;
  timeSeriesIntervalInSeconds: number;
  clusterUuid: string;
  pipelineId: string;
  version: PipelineVersion;
  vertexId: string;
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

  const start = version.firstSeen;
  const end = version.lastSeen;

  const moduleType = 'logstash';
  const dataset = 'node_stats';
  const type = 'logstash_stats';

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

  return fetchPipelineVertexTimeSeriesStats({
    query,
    pipelineId,
    version,
    vertexId,
    timeSeriesIntervalInSeconds,
    maxBucketSize: config.ui.max_bucket_size,
    callWithRequest,
    req,
  });
}
