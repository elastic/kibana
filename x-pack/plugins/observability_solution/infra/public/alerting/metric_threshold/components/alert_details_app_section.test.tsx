/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
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
import { Groups } from './groups';
import { Tags } from './tags';

const mockedChartStartContract = chartPluginMock.createStartContract();

jest.mock('@kbn/observability-alert-details', () => ({
  AlertAnnotation: () => {},
  AlertActiveTimeRangeAnnotation: () => {},
}));

jest.mock('@kbn/observability-get-padded-alert-time-range-util', () => ({
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
    services: {
      ...mockCoreMock.createStart(),
      charts: mockedChartStartContract,
    },
  }),
}));

describe('AlertDetailsAppSection', () => {
  const queryClient = new QueryClient();
  const mockedSetAlertSummaryFields = jest.fn();
  const ruleLink = 'ruleLink';
  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <AlertDetailsAppSection
            alert={buildMetricThresholdAlert()}
            rule={buildMetricThresholdRule()}
            ruleLink={ruleLink}
            setAlertSummaryFields={mockedSetAlertSummaryFields}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render rule and alert data', async () => {
    const result = renderComponent();

    expect((await result.findByTestId('metricThresholdAppSection')).children.length).toBe(3);
    expect(result.getByTestId('threshold-2000-2500')).toBeTruthy();
  });

  it('should render alert summary fields', async () => {
    renderComponent();

    expect(mockedSetAlertSummaryFields).toBeCalledTimes(1);
    expect(mockedSetAlertSummaryFields).toBeCalledWith([
      {
        label: 'Source',
        value: (
          <Groups
            groups={[
              {
                field: 'host.name',
                value: 'host-1',
              },
            ]}
          />
        ),
      },
      {
        label: 'Tags',
        value: <Tags tags={['tag 1', 'tag 2']} />,
      },
      {
        label: 'Rule',
        value: (
          <EuiLink data-test-subj="metricsRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
            Monitoring hosts
          </EuiLink>
        ),
      },
    ]);
  });

  it('should render annotations', async () => {
    const mockedExpressionChart = jest.fn(() => <div data-test-subj="ExpressionChart" />);
    (ExpressionChart as jest.Mock).mockImplementation(mockedExpressionChart);
    renderComponent();

    expect(mockedExpressionChart).toHaveBeenCalledTimes(3);
    expect(mockedExpressionChart.mock.calls[0]).toMatchSnapshot();
  });
});
