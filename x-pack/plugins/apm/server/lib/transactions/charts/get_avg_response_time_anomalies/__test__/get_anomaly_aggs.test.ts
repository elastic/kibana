/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getAnomalyAggs } from '../get_anomaly_aggs';

test('getAnomalyAggs should swallow HTTP errors', () => {
  const httpError = new Error('anomaly lookup failed') as any;
  httpError.statusCode = 418;
  const failClient = jest.fn(() => Promise.reject(httpError));

  return expect(getAnomalyAggs({ client: failClient })).resolves.toEqual(null);
});

test('getAnomalyAggs should throw other errors', () => {
  const otherError = new Error('anomaly lookup ASPLODED') as any;
  const failClient = jest.fn(() => Promise.reject(otherError));

  return expect(
    getAnomalyAggs({
      client: failClient
    })
  ).rejects.toThrow(otherError);
});
