/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyMetric } from '../classes';

describe('LatencyMetric for Query/Index Metric derivatives', () => {
  const getLatencyMetric = (metricType) => {
    return new LatencyMetric({
      metric: metricType,
      field: metricType,
      fieldSource: 'test_type',
      label: `Test ${metricType} Latency Metric`,
      description: `Testing ${metricType} Latency with negative derivatives`,
      type: 'cluster',
    });
  };

  it(`LatencyMetrics return null if time and total are both negative`, () => {
    const bucket = {
      event_time_in_millis_deriv: { value: -42 },
      event_total_deriv: { value: -6 },
    };
    expect(getLatencyMetric('query').calculation(bucket)).toEqual(null);
    expect(getLatencyMetric('index').calculation(bucket)).toEqual(null);
  });

  it(`LatencyMetrics return null if total is negative`, () => {
    const bucket = {
      event_time_in_millis_deriv: { value: 42 },
      event_total_deriv: { value: -6 },
    };
    expect(getLatencyMetric('query').calculation(bucket)).toEqual(null);
    expect(getLatencyMetric('index').calculation(bucket)).toEqual(null);
  });

  it(`LatencyMetrics return null if time is negative`, () => {
    const bucket = {
      event_time_in_millis_deriv: { value: -42 },
      event_total_deriv: { value: 6 },
    };
    expect(getLatencyMetric('query').calculation(bucket)).toEqual(null);
    expect(getLatencyMetric('index').calculation(bucket)).toEqual(null);
  });
});
