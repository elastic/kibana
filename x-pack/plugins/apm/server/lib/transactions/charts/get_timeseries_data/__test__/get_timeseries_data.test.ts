/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  getTimeseriesData,
  getTpmBuckets,
  TimeSeriesResponse
} from '../get_timeseries_data';
import { responseTimeAnomalyResponse } from './response_time_anomaly_response';
import { timeseriesResponse } from './timeseries_response';

describe('get_timeseries_data', () => {
  let res: TimeSeriesResponse;
  let clientSpy: jest.Mock;
  beforeEach(async () => {
    clientSpy = jest
      .fn()
      .mockResolvedValueOnce(timeseriesResponse)
      .mockResolvedValueOnce(responseTimeAnomalyResponse);

    res = await getTimeseriesData({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      transactionName: undefined,
      setup: {
        start: 1528113600000,
        end: 1528977600000,
        client: clientSpy,
        config: {
          get: () => 'myIndex'
        }
      }
    });
  });

  it('should call client with correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should not contain first and last bucket', () => {
    const mockDates = timeseriesResponse.aggregations.transaction_results.buckets[0].timeseries.buckets.map(
      bucket => bucket.key
    );

    expect(res.dates).not.toContain(_.first(mockDates));
    expect(res.dates).not.toContain(_.last(mockDates));
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
              key: 0,
              doc_count: 0
            },
            {
              key: 1,
              doc_count: 200
            },
            {
              key: 2,
              doc_count: 300
            },
            {
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
              key: 0,
              doc_count: 0
            },
            {
              key: 1,
              doc_count: 500
            },
            {
              key: 2,
              doc_count: 100
            },
            {
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
