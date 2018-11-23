/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, last } from 'lodash';
import { timeseriesResponse } from './mock-responses/timeseries_response';
import {
  getTpmBuckets,
  TimeSeriesAPIResponse,
  timeseriesTransformer
} from './transform';

describe('timeseriesTransformer', () => {
  let res: TimeSeriesAPIResponse;
  beforeEach(async () => {
    res = await timeseriesTransformer({
      timeseriesResponse,
      avgAnomaliesResponse: undefined,
      bucketSize: 12
    });
  });

  it('should not contain first and last bucket', () => {
    const mockDates = timeseriesResponse.aggregations.transaction_results.buckets[0].timeseries.buckets.map(
      bucket => bucket.key
    );

    expect(res.dates).not.toContain(first(mockDates));
    expect(res.dates).not.toContain(last(mockDates));
    expect(res.tpmBuckets[0].values).toHaveLength(res.dates.length);
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
      { avg: 1500, key: 'HTTP 4xx', values: [1200, 1800] },
      { avg: 1800, key: 'HTTP 5xx', values: [3000, 600] }
    ]);
  });
});
