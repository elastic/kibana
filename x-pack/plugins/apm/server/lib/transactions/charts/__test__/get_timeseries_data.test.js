/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { getTimeseriesData } from '../get_timeseries_data';
import timeseriesResponse from './timeseries_response.json';
import responseTimeAnomalyResponse from './response_time_anomaly_response.json';

describe('get_timeseries_data', () => {
  let res;
  let clientSpy;
  beforeEach(async () => {
    clientSpy = jest
      .fn()
      .mockResolvedValueOnce(timeseriesResponse)
      .mockResolvedValueOnce(responseTimeAnomalyResponse);

    res = await getTimeseriesData({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      transactionName: null,
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
    expect(res.tpm_buckets[0].values).toHaveLength(res.dates.length);
  });

  it('should have correct order', () => {
    expect(res.tpm_buckets.map(bucket => bucket.key)).toEqual([
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
