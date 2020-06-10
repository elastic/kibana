/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../public/utils/testHelpers';
import { getClientMetrics } from './get_client_metrics';
import { getImpressionTrends } from './get_impression_trends';
import { getPageLoadDistribution } from './get_page_load_distribution';

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

  it('fetches impression trends', async () => {
    mock = await inspectSearchParams((setup) =>
      getImpressionTrends({
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches page load distribution', async () => {
    mock = await inspectSearchParams((setup) =>
      getPageLoadDistribution({
        setup,
      })
    );
    expect(mock.params).toMatchSnapshot();
  });
});
