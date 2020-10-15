/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// "listing metrics" is an array of metric objects from metrics/metrics.js
// used for getting some time series data to add to the response
export const LISTING_METRICS_NAMES = [
  'node_cgroup_quota',
  'node_cgroup_throttled',
  'node_cpu_utilization',
  'node_load_average',
  'node_jvm_mem_percent',
  'node_free_space',
];

export const LISTING_METRICS_PATHS = [`aggregations.nodes.buckets.by_date.buckets`];
