/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clientMetricsQuery } from './client_metrics_query';

describe('clientMetricsQuery', () => {
  it('fetches client metrics', () => {
    const query = clientMetricsQuery(0, 50000, 50, '', {
      environment: 'staging',
    });
    expect(query).toMatchSnapshot();
  });
});
