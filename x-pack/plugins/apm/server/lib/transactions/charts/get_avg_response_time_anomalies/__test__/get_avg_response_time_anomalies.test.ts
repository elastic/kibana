/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAvgResponseTimeAnomalies } from '../get_avg_response_time_anomalies';
import firstBucketsResponse from './mockData/firstBucketsResponse.json';
import mainBucketsResponse from './mockData/mainBucketsResponse.json';

describe('get_avg_response_time_anomalies', () => {
  it('', async () => {
    const clientSpy = jest
      .fn()
      .mockResolvedValueOnce(mainBucketsResponse)
      .mockResolvedValueOnce(firstBucketsResponse);

    const avgAnomalies = await getAvgResponseTimeAnomalies({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      setup: {
        start: 1528113600000,
        end: 1528977600000,
        client: clientSpy,
        config: {
          get: () => 'myIndex'
        }
      }
    });

    expect(avgAnomalies).toEqual({
      bucketSpanAsMillis: 10800000,
      buckets: [
        {
          anomalyScore: null,
          lower: 17688.182675688193,
          upper: 50381.01051622894
        },
        { anomalyScore: null, lower: null, upper: null },
        {
          anomalyScore: 0,
          lower: 16034.081569306454,
          upper: 54158.77731018045
        },
        { anomalyScore: null, lower: null, upper: null },
        {
          anomalyScore: 0,
          lower: 16034.081569306454,
          upper: 54158.77731018045
        },
        { anomalyScore: null, lower: null, upper: null }
      ]
    });
  });
});
