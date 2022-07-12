/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { getClientMetrics } from './get_client_metrics';
import { getLongTaskMetrics } from './get_long_task_metrics';

describe('rum client dashboard queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches client metrics', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getClientMetrics({
          setup,
          start: 0,
          end: 50000,
        }),
      { uiFilters: { environment: 'staging' } }
    );

    expect(mock.params).toMatchSnapshot();
  });
});
