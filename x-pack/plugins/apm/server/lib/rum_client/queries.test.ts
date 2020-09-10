/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { getClientMetrics } from './get_client_metrics';
import { getPageViewTrends } from './get_page_view_trends';
import { getPageLoadDistribution } from './get_page_load_distribution';
import { getRumServices } from './get_rum_services';

describe('rum client dashboard queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches client metrics', async () => {
    mock = await inspectSearchParams((setup) =>
      getClientMetrics({
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches page view trends', async () => {
    mock = await inspectSearchParams((setup) =>
      getPageViewTrends({
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches page load distribution', async () => {
    mock = await inspectSearchParams((setup) =>
      getPageLoadDistribution({
        setup,
        minPercentile: '0',
        maxPercentile: '99',
      })
    );
    expect(mock.params).toMatchSnapshot();
  });

  it('fetches rum services', async () => {
    mock = await inspectSearchParams((setup) =>
      getRumServices({
        setup,
      })
    );
    expect(mock.params).toMatchSnapshot();
  });
});
