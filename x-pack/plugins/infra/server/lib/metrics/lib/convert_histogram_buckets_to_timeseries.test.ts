/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsAPIRequest } from '../../../../common/http_api';
import moment from 'moment';
import { convertHistogramBucketsToTimeseries } from './convert_histogram_buckets_to_timeseries';

const keys = ['example-0'];

const options: MetricsAPIRequest = {
  timerange: {
    field: '@timestamp',
    from: moment('2020-01-01T00:00:00Z').valueOf(),
    to: moment('2020-01-01T01:00:00Z').valueOf(),
    interval: '1m',
  },
  limit: 9,
  indexPattern: 'metrics-*',
  metrics: [
    { id: 'metric_0', aggregations: { metric_0: { avg: { field: 'system.cpu.user.pct' } } } },
  ],
};

const buckets = [
  {
    key: moment('2020-01-01T00:00:00Z').valueOf(),
    key_as_string: moment('2020-01-01T00:00:00Z').toISOString(),
    doc_count: 1,
    metric_0: { value: 1 },
  },
  {
    key: moment('2020-01-01T00:00:00Z').add(1, 'minute').valueOf(),
    key_as_string: moment('2020-01-01T00:00:00Z').add(1, 'minute').toISOString(),
    doc_count: 1,
    metric_0: { value: 1 },
  },
  {
    key: moment('2020-01-01T00:00:00Z').add(2, 'minute').valueOf(),
    key_as_string: moment('2020-01-01T00:00:00Z').add(2, 'minute').toISOString(),
    doc_count: 1,
    metric_0: { value: 1 },
  },
  {
    key: moment('2020-01-01T00:00:00Z').add(2, 'minute').valueOf(),
    key_as_string: moment('2020-01-01T00:00:00Z').add(2, 'minute').toISOString(),
    doc_count: 1,
    metric_0: { value: null },
  },
];

describe('convertHistogramBucketsToTimeseies(keys, options, buckets)', () => {
  it('should just work', () => {
    expect(convertHistogramBucketsToTimeseries(keys, options, buckets)).toMatchSnapshot();
  });
  it('should drop the last bucket', () => {
    expect(
      convertHistogramBucketsToTimeseries(keys, { ...options, dropLastBucket: true }, buckets)
    ).toMatchSnapshot();
  });
  it('should return empty timeseries for empty metrics', () => {
    expect(
      convertHistogramBucketsToTimeseries(keys, { ...options, metrics: [] }, buckets)
    ).toMatchSnapshot();
  });
  it('should work with normalized_values', () => {
    const bucketsWithNormalizedValue = buckets.map((bucket) => {
      const value = bucket.metric_0.value;
      if (value) {
        return { ...bucket, metric_0: { value, normalized_value: value + 1 } };
      }
      return bucket;
    });
    expect(
      convertHistogramBucketsToTimeseries(keys, { ...options }, bucketsWithNormalizedValue)
    ).toMatchSnapshot();
  });
  it('should work with percentiles', () => {
    const bucketsWithPercentiles = buckets.map((bucket) => {
      return { ...bucket, metric_0: { values: { '95.0': 3 } } };
    });
    expect(
      convertHistogramBucketsToTimeseries(keys, { ...options }, bucketsWithPercentiles)
    ).toMatchSnapshot();
  });
  it('should throw error with multiple percentiles', () => {
    const bucketsWithMultiplePercentiles = buckets.map((bucket) => {
      return { ...bucket, metric_0: { values: { '95.0': 3, '99.0': 4 } } };
    });
    expect(() =>
      convertHistogramBucketsToTimeseries(keys, { ...options }, bucketsWithMultiplePercentiles)
    ).toThrow();
  });
  it('should work with keyed percentiles', () => {
    const bucketsWithKeyedPercentiles = buckets.map((bucket) => {
      return { ...bucket, metric_0: { values: [{ key: '99.0', value: 4 }] } };
    });
    expect(
      convertHistogramBucketsToTimeseries(keys, { ...options }, bucketsWithKeyedPercentiles)
    ).toMatchSnapshot();
  });
  it('should throw error with multiple keyed percentiles', () => {
    const bucketsWithMultipleKeyedPercentiles = buckets.map((bucket) => {
      return {
        ...bucket,
        metric_0: {
          values: [
            { key: '95.0', value: 3 },
            { key: '99.0', value: 4 },
          ],
        },
      };
    });
    expect(() =>
      convertHistogramBucketsToTimeseries(keys, { ...options }, bucketsWithMultipleKeyedPercentiles)
    ).toThrow();
  });
});
