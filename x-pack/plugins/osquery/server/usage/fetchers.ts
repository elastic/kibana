/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
    SingleBucketAggregate,
    TopHitsAggregate,
    ValueAggregate,
} from '@elastic/elasticsearch/api/types';
import {getUsageRecorder} from '../routes/usage'
import { ElasticsearchClient } from '../../../../../src/core/server';
import { METRICS_INDICES } from './constants';

export interface MetricEntry {
  max?: number;
  latest?: number;
  avg?: number;
}

export interface BeatMetricAggregation {
  rss: MetricEntry;
  cpuMs: MetricEntry;
}

// TODO: pipe this through ES
export function getLiveQueryUsage() {
    const usageRecorder = getUsageRecorder()
    return usageRecorder.getRouteMetric('live_query')
}

export async function getBeatUsage(esClient: ElasticsearchClient) {
  // is there a better way to get these aggregates?
  // needs a time window limit to make sure the reports are fresh
  // XXX: these aggregates conflate agents, they should be broken out by id
  // XXX: currently cpu is recorded as a duration rather than a load %
  const { body: metricResponse } = await esClient.search({
    body: {
      size: 0,
      aggs: {
        lastDay: {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-24h',
                lte: 'now',
              },
            },
          },
          aggs: {
            latest: {
              top_hits: {
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                ],
                size: 1,
              },
            },
            max_rss: {
              max: {
                field: 'monitoring.metrics.beat.memstats.rss',
              },
            },
            avg_rss: {
              avg: {
                field: 'monitoring.metrics.beat.memstats.rss',
              },
            },
            max_cpu: {
              max: {
                field: 'monitoring.metrics.beat.cpu.total.time.ms',
              },
            },
            avg_cpu: {
              avg: {
                field: 'monitoring.metrics.beat.cpu.total.time.ms',
              },
            },
          },
        },
      },
    },
    index: METRICS_INDICES,
  });
  const lastDayAggs = metricResponse.aggregations?.lastDay as SingleBucketAggregate;
  const result: BeatMetricAggregation = {
    rss: {},
    cpuMs: {},
  };

  // XXX: discrimating the union types gets hairy when attempting to genericize, figure out a fix!
  if ('max_rss' in lastDayAggs) {
      result.rss.max = (lastDayAggs.max_rss as ValueAggregate).value
  }

  if ('avg_rss' in lastDayAggs) {
      result.rss.avg = (lastDayAggs.max_rss as ValueAggregate).value
  }

  if ('max_cpu' in lastDayAggs) {
      result.cpuMs.max = (lastDayAggs.max_cpu as ValueAggregate).value
  }

  if ('avg_cpu' in lastDayAggs) {
      result.cpuMs.avg = (lastDayAggs.max_cpu as ValueAggregate).value
  }

  if ('latest' in lastDayAggs) {
    const latest = (lastDayAggs.latest as TopHitsAggregate).hits.hits[0]?._source?.monitoring.metrics.beat;
    result.cpuMs.latest = latest.cpu.total.time.ms;
    result.rss.latest = latest.memstats.rss;
  }

  return result;
}
