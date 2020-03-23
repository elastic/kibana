/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMetricAggs } from '../get_metric_aggs';

describe('get metric aggs', () => {
  it('should create aggregations for "basic" metrics', () => {
    const listingMetrics = ['node_cpu_utilization', 'node_jvm_mem_percent'];
    const bucketSize = 30;
    expect(getMetricAggs(listingMetrics, bucketSize)).toMatchSnapshot();
  });

  it('should incorporate a metric custom aggs', () => {
    const listingMetrics = ['node_index_latency', 'node_query_latency'];
    const bucketSize = 30;
    expect(getMetricAggs(listingMetrics, bucketSize)).toMatchSnapshot();
  });
});
