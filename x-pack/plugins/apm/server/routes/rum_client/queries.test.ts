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
import { getPageViewTrends } from './get_page_view_trends';
import { getPageLoadDistribution } from './get_page_load_distribution';
import { getRumServices } from './get_rum_services';
import { getLongTaskMetrics } from './get_long_task_metrics';
import { getWebCoreVitals } from './get_web_core_vitals';
import { getJSErrors } from './get_js_errors';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

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

  it('fetches rum services', async () => {
    mock = await inspectSearchParams((setup) =>
      getRumServices({
        setup,
        start: 0,
        end: 50000,
      })
    );
    expect(mock.params).toMatchSnapshot();
  });

  it('fetches rum core vitals', async () => {
    mock = await inspectSearchParams(
      (setup) =>
        getWebCoreVitals({
          setup,
          start: 0,
          end: 50000,
        }),
      { uiFilters: { environment: ENVIRONMENT_ALL.value } }
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

  it('fetches js errors', async () => {
    mock = await inspectSearchParams((setup) =>
      getJSErrors({
        setup,
        pageSize: 5,
        pageIndex: 0,
        start: 0,
        end: 50000,
      })
    );
    expect(mock.params).toMatchSnapshot();
  });
});
