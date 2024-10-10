/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { RuleConditionChart } from '../../../rule_condition_chart/rule_condition_chart';
import { CustomThresholdAlert } from '../types';
import AlertDetailsAppSection from './alert_details_app_section';

const mockedChartStartContract = chartPluginMock.createStartContract();

jest.mock('@kbn/observability-alert-details', () => ({
  AlertAnnotation: () => {},
  AlertActiveTimeRangeAnnotation: () => {},
  useAlertsHistory: () => ({
    data: {
      histogramTriggeredAlerts: [
        { key_as_string: '2023-04-10T00:00:00.000Z', key: 1681084800000, doc_count: 2 },
      ],
      avgTimeToRecoverUS: 0,
      totalTriggeredAlerts: 2,
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@kbn/observability-get-padded-alert-time-range-util', () => ({
  getPaddedAlertTimeRange: () => ({
    from: '2023-03-28T10:43:13.802Z',
    to: '2023-03-29T13:14:09.581Z',
  }),
}));

jest.mock('../../../rule_condition_chart/rule_condition_chart', () => ({
  RuleConditionChart: jest.fn(() => <div data-test-subj="RuleConditionChart" />),
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
      share: {
        url: {
          locators: {
            get: jest
              .fn()
              .mockReturnValue({ getRedirectUrl: jest.fn().mockReturnValue('/view-in-app-url') }),
          },
        },
      },
    },
  }),
}));

describe('AlertDetailsAppSection', () => {
  const queryClient = new QueryClient();
  const mockedSetRelatedAlertsKuery = jest.fn();

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
            setRelatedAlertsKuery={mockedSetRelatedAlertsKuery}
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

    expect((await result.findByTestId('thresholdAlertOverviewSection')).children.length).toBe(6);
    expect(result.getByTestId('threshold-2000-2500')).toBeTruthy();
  });

  it('should render annotations', async () => {
    const mockedRuleConditionChart = jest.fn(() => <div data-test-subj="RuleConditionChart" />);
    (RuleConditionChart as jest.Mock).mockImplementation(mockedRuleConditionChart);
    const alertDetailsAppSectionComponent = renderComponent(
      {},
      { ['kibana.alert.end']: '2023-03-28T14:40:00.000Z' }
    );

    expect(alertDetailsAppSectionComponent.getAllByTestId('RuleConditionChart').length).toBe(6);
    expect(mockedRuleConditionChart.mock.calls[0]).toMatchSnapshot();
  });

  it('should set relatedAlertsKuery', async () => {
    renderComponent();

    expect(mockedSetRelatedAlertsKuery).toBeCalledTimes(1);
    expect(mockedSetRelatedAlertsKuery).toHaveBeenLastCalledWith(
      '(tags: "tag 1" or tags: "tag 2") or (host.name: "host-1" or kibana.alert.group.value: "host-1")'
    );
  });

  it('should render title on condition charts', async () => {
    const result = renderComponent();

    expect(result.getByTestId('chartTitle-0').textContent).toBe(
      'Equation result for count (host.name: host-1)'
    );
    expect((result.getByTestId('viewLogs-0') as any).href).toBe('http://localhost/view-in-app-url');

    expect(result.getByTestId('chartTitle-1').textContent).toBe(
      'Equation result for max (system.cpu.user.pct)'
    );
    expect((result.getByTestId('viewLogs-1') as any).href).toBe('http://localhost/view-in-app-url');

    expect(result.getByTestId('chartTitle-2').textContent).toBe(
      'Equation result for min (system.memory.used.pct)'
    );
    expect((result.getByTestId('viewLogs-2') as any).href).toBe('http://localhost/view-in-app-url');

    expect(result.getByTestId('chartTitle-3').textContent).toBe(
      'Equation result for min (system.memory.used.pct) + min (system.memory.used.pct) + min (system.memory.used.pct) + min (system.memory.used.pct...'
    );
    expect((result.getByTestId('viewLogs-3') as any).href).toBe('http://localhost/view-in-app-url');

    expect(result.getByTestId('chartTitle-4').textContent).toBe(
      'Equation result for min (system.memory.used.pct) + min (system.memory.used.pct)'
    );
    expect((result.getByTestId('viewLogs-4') as any).href).toBe('http://localhost/view-in-app-url');

    expect(result.getByTestId('chartTitle-5').textContent).toBe(
      'Equation result for min (system.memory.used.pct) + min (system.memory.used.pct) + min (system.memory.used.pct)'
    );
    expect((result.getByTestId('viewLogs-5') as any).href).toBe('http://localhost/view-in-app-url');
  });
});
