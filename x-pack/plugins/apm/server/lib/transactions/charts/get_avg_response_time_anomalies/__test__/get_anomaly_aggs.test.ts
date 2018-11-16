/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getAnomalyAggs } from '../get_anomaly_aggs';

test('getAnomalyAggs should swallow errors', () => {
  const failClient = jest.fn(() =>
    Promise.reject(new Error('anomaly lookup failed'))
  );

  expect(getAnomalyAggs({ client: failClient })).resolves.toEqual(null);
});
