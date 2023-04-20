/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  buildMetricThresholdAlert,
  buildMetricThresholdRule,
} from '../mocks/metric_threshold_rule';
import { AlertDetailsAppSection } from './alert_details_app_section';
import { ExpressionChart } from './expression_chart';

jest.mock('@kbn/observability-alert-details', () => ({
  AlertAnnotation: () => {},
  AlertActiveTimeRangeAnnotation: () => {},
  getPaddedAlertTimeRange: () => ({
    from: '2023-03-28T10:43:13.802Z',
    to: '2023-03-29T13:14:09.581Z',
  }),
}));

jest.mock('./expression_chart', () => ({
  ExpressionChart: jest.fn(() => <div data-test-subj="ExpressionChart" />),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: mockCoreMock.createStart(),
  }),
}));

jest.mock('../../../containers/metrics_source/source', () => ({
  withSourceProvider: () => jest.fn,
  useSourceContext: () => ({
    source: { id: 'default' },
    createDerivedIndexPattern: () => ({ fields: [], title: 'metricbeat-*' }),
  }),
}));

describe('AlertDetailsAppSection', () => {
  const queryClient = new QueryClient();
  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <AlertDetailsAppSection
            alert={buildMetricThresholdAlert()}
            rule={buildMetricThresholdRule()}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
  };

  it('should render rule data', async () => {
    const result = renderComponent();

    expect((await result.findByTestId('metricThresholdAppSection')).children.length).toBe(3);
  });

  it('should render annotations', async () => {
    const mockedExpressionChart = jest.fn(() => <div data-test-subj="ExpressionChart" />);
    (ExpressionChart as jest.Mock).mockImplementation(mockedExpressionChart);
    renderComponent();

    expect(mockedExpressionChart).toHaveBeenCalledTimes(3);
    expect(mockedExpressionChart.mock.calls[0]).toMatchSnapshot();
  });
});
