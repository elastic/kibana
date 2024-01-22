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
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  buildCustomThresholdAlert,
  buildCustomThresholdRule,
} from '../../mocks/custom_threshold_rule';
import { CustomThresholdAlertFields } from '../../types';
import { ExpressionChart } from '../expression_chart';
import AlertDetailsAppSection, { CustomThresholdAlert } from './alert_details_app_section';
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

jest.mock('../expression_chart', () => ({
  ExpressionChart: jest.fn(() => <div data-test-subj="ExpressionChart" />),
}));

jest.mock('../../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      ...mockCoreMock.createStart(),
      charts: mockedChartStartContract,
      aiops: {
        EmbeddableChangePointChart: jest.fn(),
      },
      data: {
        search: jest.fn(),
      },
    },
  }),
}));

describe('AlertDetailsAppSection', () => {
  const queryClient = new QueryClient();
  const mockedSetAlertSummaryFields = jest.fn();
  const ruleLink = 'ruleLink';

  const renderComponent = (
    alert: Partial<CustomThresholdAlert> = {},
    alertFields: Partial<ParsedTechnicalFields & CustomThresholdAlertFields> = {}
  ) => {
    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <AlertDetailsAppSection
            alert={buildCustomThresholdAlert(alert, alertFields)}
            rule={buildCustomThresholdRule()}
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

    expect((await result.findByTestId('thresholdAlertOverviewSection')).children.length).toBe(3);
    expect(result.getByTestId('thresholdRule-2000-2500')).toBeTruthy();
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
          <EuiLink data-test-subj="thresholdRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
            Monitoring hosts
          </EuiLink>
        ),
      },
    ]);
  });

  it('should not render group and tag summary fields', async () => {
    const alertFields = { tags: [], 'kibana.alert.group': undefined };
    renderComponent({}, alertFields);

    expect(mockedSetAlertSummaryFields).toBeCalledTimes(1);
    expect(mockedSetAlertSummaryFields).toBeCalledWith([
      {
        label: 'Rule',
        value: (
          <EuiLink data-test-subj="thresholdRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
            Monitoring hosts
          </EuiLink>
        ),
      },
    ]);
  });

  it('should render annotations', async () => {
    const mockedExpressionChart = jest.fn(() => <div data-test-subj="ExpressionChart" />);
    (ExpressionChart as jest.Mock).mockImplementation(mockedExpressionChart);
    const alertDetailsAppSectionComponent = renderComponent();

    expect(alertDetailsAppSectionComponent.getAllByTestId('ExpressionChart').length).toBe(3);
    expect(mockedExpressionChart.mock.calls[0]).toMatchSnapshot();
  });
});
