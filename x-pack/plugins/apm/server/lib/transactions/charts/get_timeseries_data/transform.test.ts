/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timeseriesResponse } from './mock_responses/timeseries_response';
import {
  ApmTimeSeriesResponse,
  getTpmBuckets,
  timeseriesTransformer,
} from './transform';

describe('timeseriesTransformer', () => {
  let res: ApmTimeSeriesResponse;
  beforeEach(async () => {
    res = await timeseriesTransformer({
      timeseriesResponse,
      bucketSize: 120,
      durationAsMinutes: 10,
    });
  });

  it('should have correct order', () => {
    expect(res.tpmBuckets.map((bucket) => bucket.key)).toEqual([
      'HTTP 2xx',
      'HTTP 3xx',
      'HTTP 4xx',
      'HTTP 5xx',
      'A Custom Bucket (that should be last)',
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
              doc_count: 0,
            },
            {
              key_as_string: '',
              key: 1,
              doc_count: 200,
            },
            {
              key_as_string: '',
              key: 2,
              doc_count: 300,
            },
            {
              key_as_string: '',
              key: 3,
              doc_count: 400,
            },
          ],
        },
      },
      {
        key: 'HTTP 5xx',
        doc_count: 400,
        timeseries: {
          buckets: [
            {
              key_as_string: '',
              key: 0,
              doc_count: 0,
            },
            {
              key_as_string: '',
              key: 1,
              doc_count: 100,
            },
            {
              key_as_string: '',
              key: 2,
              doc_count: 100,
            },
            {
              key_as_string: '',
              key: 3,
              doc_count: 300,
            },
          ],
        },
      },
    ];

    expect(
      getTpmBuckets({
        transactionResultBuckets: buckets,
        bucketSize: 120,
        durationAsMinutes: 10,
      })
    ).toEqual([
      {
        avg: 90,
        dataPoints: [
          { x: 0, y: 0 },
          { x: 1, y: 100 },
          { x: 2, y: 150 },
          { x: 3, y: 200 },
        ],
        key: 'HTTP 4xx',
      },
      {
        avg: 50,
        dataPoints: [
          { x: 0, y: 0 },
          { x: 1, y: 50 },
          { x: 2, y: 50 },
          { x: 3, y: 150 },
        ],
        key: 'HTTP 5xx',
      },
    ]);
  });
});
