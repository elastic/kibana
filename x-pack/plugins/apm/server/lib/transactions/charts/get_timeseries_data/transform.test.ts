/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, last } from 'lodash';
import { timeseriesResponse } from './mock-responses/timeseries_response';
import {
  ApmTimeSeriesResponse,
  getTpmBuckets,
  timeseriesTransformer
} from './transform';

describe('timeseriesTransformer', () => {
  let res: ApmTimeSeriesResponse;
  beforeEach(async () => {
    res = await timeseriesTransformer({
      timeseriesResponse,
      bucketSize: 12
    });
  });

  it('should not contain first and last bucket', () => {
    const mockDates = timeseriesResponse.aggregations.transaction_results.buckets[0].timeseries.buckets.map(
      bucket => bucket.key
    );

    expect(first(res.responseTimes.avg).x).not.toBe(first(mockDates));
    expect(last(res.responseTimes.avg).x).not.toBe(last(mockDates));

    expect(first(res.tpmBuckets[0].dataPoints).x).not.toBe(first(mockDates));
    expect(last(res.tpmBuckets[0].dataPoints).x).not.toBe(last(mockDates));
  });

  it('should have correct order', () => {
    expect(res.tpmBuckets.map(bucket => bucket.key)).toEqual([
      'HTTP 2xx',
      'HTTP 3xx',
      'HTTP 4xx',
      'HTTP 5xx',
      'A Custom Bucket (that should be last)'
    ]);
  });

  it('should match snapshot', () => {
    expect(res).toMatchSnapshot();
  });
});

describe('getTpmBuckets', () => {
  it('should return response', () => {
    const buckets = [
      {
        key: 'HTTP 4xx',
        doc_count: 300,
        timeseries: {
          buckets: [
            {
              key_as_string: '',
              key: 0,
              doc_count: 0
            },
            {
              key_as_string: '',
              key: 1,
              doc_count: 200
            },
            {
              key_as_string: '',
              key: 2,
              doc_count: 300
            },
            {
              key_as_string: '',
              key: 3,
              doc_count: 1337
            }
          ]
        }
      },
      {
        key: 'HTTP 5xx',
        doc_count: 400,
        timeseries: {
          buckets: [
            {
              key_as_string: '',
              key: 0,
              doc_count: 0
            },
            {
              key_as_string: '',
              key: 1,
              doc_count: 500
            },
            {
              key_as_string: '',
              key: 2,
              doc_count: 100
            },
            {
              key_as_string: '',
              key: 3,
              doc_count: 1337
            }
          ]
        }
      }
    ];
    const bucketSize = 10;
    expect(getTpmBuckets(buckets, bucketSize)).toEqual([
      { dataPoints: [{ x: 1, y: 1200 }, { x: 2, y: 1800 }], key: 'HTTP 4xx' },
      { dataPoints: [{ x: 1, y: 3000 }, { x: 2, y: 600 }], key: 'HTTP 5xx' }
    ]);
  });
});
