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
import { getPageViewTrends } from './get_page_view_trends';
import { getPageLoadDistribution } from './get_page_load_distribution';
import { getLongTaskMetrics } from './get_long_task_metrics';

describe('rum client dashboard queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches page view trends', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getPageViewTrends({
          setup,
          start: 0,
          end: 50000,
        }),
      { uiFilters: { environment: 'staging' } }
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches page load distribution', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getPageLoadDistribution({
          setup,
          minPercentile: '0',
          maxPercentile: '99',
          start: 0,
          end: 50000,
        }),
      { uiFilters: { environment: 'staging' } }
    );
    expect(mock.params).toMatchSnapshot();
  });

  it('fetches long task metrics', async () => {
    mock = await inspectSearchParams((setup) =>
      getLongTaskMetrics({
        setup,
        start: 0,
        end: 50000,
      })
    );
    expect(mock.params).toMatchSnapshot();
  });
});
