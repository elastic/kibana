/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, last } from 'lodash';
import { createQuery } from '../create_query';
import { ElasticsearchMetric } from '../metrics';

function scalarCounterAggregation(field, fieldPath, ephemeralIdField, maxBucketSize) {
  const fullPath = `${fieldPath}.${field}`;

  const byEphemeralIdName = `${field}_temp_by_ephemeral_id`;
  const sumName = `${field}_total`;

  const aggs = {};

  aggs[byEphemeralIdName] = {
    terms: {
      field: ephemeralIdField,
      size: maxBucketSize,
    },
    aggs: {
      stats: {
        stats: { field: fullPath }
      },
      difference: {
        bucket_script: {
          script: 'params.max - params.min',
          buckets_path: {
            min: 'stats.min',
            max: 'stats.max'
          }
        }
      }
    }
  };

  aggs[sumName] = {
    sum_bucket: {
      buckets_path: `${byEphemeralIdName}>difference`
    }
  };

  return aggs;
}

function nestedVertices(maxBucketSize) {
  const fieldPath = 'logstash_stats.pipelines.vertices';
  const ephemeralIdField = 'logstash_stats.pipelines.vertices.pipeline_ephemeral_id';

  return {
    nested: { path: 'logstash_stats.pipelines.vertices' },
    aggs: {
      vertex_id: {
        terms: {
          field: 'logstash_stats.pipelines.vertices.id',
          size: maxBucketSize
        },
        aggs: {
          ...scalarCounterAggregation('events_in', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation('events_out', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation('duration_in_millis', fieldPath, ephemeralIdField, maxBucketSize),
          ...scalarCounterAggregation('queue_push_duration_in_millis', fieldPath, ephemeralIdField, maxBucketSize)
        }
      }
    }
  };
}

function createScopedAgg(pipelineId, pipelineHash, agg) {
  return {
    pipelines: {
      nested: { path: 'logstash_stats.pipelines' },
      aggs: {
        scoped: {
          filter: {
            bool: {
              filter: [
                { term: { 'logstash_stats.pipelines.id': pipelineId } },
                { term: { 'logstash_stats.pipelines.hash': pipelineHash } }
              ]
            }
          },
          aggs: agg
        }
      }
    }
  };
}

function createTimeseriesAggs(pipelineId, pipelineHash, maxBucketSize, timeseriesInterval, lastTimeBucket) {
  return {
    by_time: {
      composite: {
        sources: [
          {
            time_bucket: {
              date_histogram: {
                field: 'logstash_stats.timestamp',
                interval: timeseriesInterval + 's'
              }
            }
          }
        ],
        after: {
          time_bucket: lastTimeBucket
        }
      },
      aggs: createScopedAgg(pipelineId, pipelineHash, {
        vertices: nestedVertices(maxBucketSize),
        total_processor_duration_stats: {
          stats: {
            field: "logstash_stats.pipelines.events.duration_in_millis"
          }
        }
      })
    }
  };
}

function fetchPipelineTimeseriesStats(query, logstashIndexPattern, pipelineId, version,
  maxBucketSize, timeseriesInterval, callWithRequest, req, lastTimeBucket = 0) {
  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.by_time.buckets.key.time_bucket',
      'aggregations.by_time.buckets.pipelines.scoped.vertices.vertex_id.buckets.key',
      'aggregations.by_time.buckets.pipelines.scoped.vertices.vertex_id.buckets.events_in_total',
      'aggregations.by_time.buckets.pipelines.scoped.vertices.vertex_id.buckets.events_out_total',
      'aggregations.by_time.buckets.pipelines.scoped.vertices.vertex_id.buckets.duration_in_millis_total',
      'aggregations.by_time.buckets.pipelines.scoped.vertices.vertex_id.buckets.queue_push_duration_in_millis_total',
      'aggregations.by_time.buckets.pipelines.scoped.total_processor_duration_stats'
    ],
    body: {
      query: query,
      aggs: createTimeseriesAggs(pipelineId, version.hash, maxBucketSize, timeseriesInterval, lastTimeBucket)
    }
  };

  return callWithRequest(req, 'search', params);
}

export async function getPipelineStatsAggregation(callWithRequest, req, logstashIndexPattern, timeseriesInterval,
  { clusterUuid, start, end, pipelineId, version }) {
  const filters = [
    {
      nested: {
        path: 'logstash_stats.pipelines',
        query: {
          bool: {
            must: [
              { term: { 'logstash_stats.pipelines.hash': version.hash } },
              { term: { 'logstash_stats.pipelines.id': pipelineId } },
            ]
          }
        }
      }
    }
  ];

  const query = createQuery({
    type: 'logstash_stats',
    start,
    end,
    metric: ElasticsearchMetric.getMetricFields(),
    clusterUuid,
    filters
  });

  const config = req.server.config();

  const timeBuckets = [];
  let paginatedTimeBuckets;
  do {
    const lastTimeBucket = get(last(paginatedTimeBuckets), 'key.time_bucket', 0);
    const paginatedResponse = await fetchPipelineTimeseriesStats(query, logstashIndexPattern, pipelineId, version,
      config.get('xpack.monitoring.max_bucket_size'), timeseriesInterval, callWithRequest, req, lastTimeBucket);

    paginatedTimeBuckets = get(paginatedResponse, 'aggregations.by_time.buckets', []);
    timeBuckets.push(...paginatedTimeBuckets);
  } while (paginatedTimeBuckets.length > 0);

  // Drop the last bucket if it is partial (spoiler alert: this will be the case most of the time)
  const lastTimeBucket = last(timeBuckets);
  if (version.lastSeen - lastTimeBucket.key.time_bucket < timeseriesInterval * 1000) {
    timeBuckets.pop();
  }

  return {
    timeseriesStats: timeBuckets
  };
}
