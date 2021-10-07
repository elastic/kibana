/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchResponse } from '../../../common/types/es';

export const getDiffCalculation = (max: number | null, min: number | null) => {
  // no need to test max >= 0, but min <= 0 which is normal for a derivative after restart
  // because we are aggregating/collapsing on ephemeral_ids
  if (max !== null && min !== null && max >= 0 && min >= 0 && max >= min) {
    return max - min;
  }

  return null;
};

export const entSearchAggFilterPath = [
  'aggregations.total',
  'aggregations.heap_used_total.value',
  'aggregations.heap_max_total.value',
  'aggregations.heap_committed_total.value',
  'aggregations.versions.buckets',
];

export const entSearchUuidsAgg = (maxBucketSize?: string) => ({
  // Count all unique agents
  total: {
    cardinality: {
      field: 'agent.id',
      precision_threshold: 10000,
    },
  },

  // Collect all runnng versions
  versions: {
    terms: {
      field: 'enterprisesearch.health.version.number',
    },
  },

  // Get per-instance values using ephemeral IDs to aggreagte metrics
  ephemeral_ids: {
    terms: {
      field: 'agent.ephemeral_id',
      size: maxBucketSize,
    },
    aggs: {
      uptime_max: {
        max: {
          field: 'enterprisesearch.health.process.uptime.sec',
        },
      },
      heap_used: {
        max: {
          field: 'enterprisesearch.health.jvm.memory_usage.heap_used.bytes',
        },
      },
      heap_total: {
        max: {
          field: 'enterprisesearch.health.jvm.memory_usage.heap_max.bytes',
        },
      },
      heap_committed: {
        max: {
          field: 'enterprisesearch.health.jvm.memory_usage.heap_committed.bytes',
        },
      },
    },
  },

  // Aggregate per-instance metrics into global values
  uptime: {
    max_bucket: {
      buckets_path: 'ephemeral_ids>uptime_max',
    },
  },
  cluster_heap_used: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>heap_used',
    },
  },
  cluster_heap_total: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>heap_total',
    },
  },
  cluster_heap_committed: {
    sum_bucket: {
      buckets_path: 'ephemeral_ids>heap_committed',
    },
  },
});

export const entSearchAggResponseHandler = (response: ElasticsearchResponse) => {
  const aggs = response.aggregations;

  const totalInstances = aggs?.total.value ?? 0;
  const uptime = aggs?.uptime.value;

  const memUsed = aggs?.cluster_heap_used.value ?? 0;
  const memCommitted = aggs?.cluster_heap_committed.value ?? 0;
  const memTotal = aggs?.cluster_heap_total.value ?? 0;

  const versions = (aggs?.versions.buckets ?? []).map(({ key }: { key: string }) => key);

  return {
    totalInstances,
    uptime,
    memUsed,
    memCommitted,
    memTotal,
    versions,
  };
};
