/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export const getDiffCalculation = (max, min) => {
  // no need to test max >= 0, but min <= 0 which is normal for a derivative after restart
  // because we are aggregating/collapsing on ephemeral_ids
  if (max !== null && min !== null && max >= 0 && min >= 0 && max >= min) {
    return max - min;
  }

  return null;
};

export const apmAggFilterPath = [
  'aggregations.total',
  'aggregations.min_events_total.value',
  'aggregations.max_events_total.value',
  'aggregations.min_mem_rss_total.value',
  'aggregations.max_mem_rss_total.value',
  'aggregations.max_mem_total_total.value',
];

export const apmUuidsAgg = maxBucketSize => ({
  total: {
    cardinality: {
      field: 'beats_stats.beat.uuid',
      precision_threshold: 10000,
    },
  },
  ephemeral_ids: {
    terms: {
      field: 'beats_stats.metrics.beat.info.ephemeral_id',
      size: maxBucketSize,
    },
    aggs: {
      min_events: {
        min: {
          field: 'beats_stats.metrics.libbeat.pipeline.events.total',
        },
      },
      max_events: {
        max: {
          field: 'beats_stats.metrics.libbeat.pipeline.events.total',
        },
      },
      min_mem_rss: {
        min: {
          field: 'beats_stats.metrics.beat.memstats.rss',
        },
      },
      max_mem_rss: {
        max: {
          field: 'beats_stats.metrics.beat.memstats.rss',
        },
      },
      max_mem_total: {
        max: {
          field: 'beats_stats.metrics.beat.memstats.memory_total',
        },
      },
    },
  },
  min_events_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>min_events',
    },
  },
  max_events_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>max_events',
    },
  },
  min_mem_rss_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>min_mem_rss',
    },
  },
  max_mem_rss_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>max_mem_rss',
    },
  },
  max_mem_total_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>max_mem_total',
    },
  },
});

export const apmAggResponseHandler = response => {
  const apmTotal = get(response, 'aggregations.total.value', null);

  const eventsTotalMax = get(response, 'aggregations.max_events_total.value', null);
  const eventsTotalMin = get(response, 'aggregations.min_events_total.value', null);
  const memRssMax = get(response, 'aggregations.max_mem_rss_total.value', null);
  const memRssMin = get(response, 'aggregations.min_mem_rss_total.value', null);
  const memTotal = get(response, 'aggregations.max_mem_total_total.value', null);

  return {
    apmTotal,
    totalEvents: getDiffCalculation(eventsTotalMax, eventsTotalMin),
    memRss: getDiffCalculation(memRssMax, memRssMin),
    memTotal,
  };
};
