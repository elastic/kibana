/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertSummaryWidget } from './alert_summary_widget';
import { AlertSummaryWidgetDependencies, AlertSummaryWidgetProps } from './types';
import { mockedAlertSummaryTimeRange, mockedChartProps } from '../../mock/alert_summary_widget';
import { useLoadAlertSummary } from '../../hooks/use_load_alert_summary';
import {
  ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ,
  TOTAL_ALERT_COUNT_DATA_TEST_SUBJ,
} from './components/constants';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';

jest.mock('../../hooks/use_load_alert_summary', () => ({
  useLoadAlertSummary: jest.fn().mockReturnValue({
    alertSummary: {
      activeAlertCount: 1,
      recoveredAlertCount: 7,
      activeAlerts: [
        { key: 1671321600000, doc_count: 0 },
        { key: 1671408000000, doc_count: 1 },
      ],
    },
  }),
}));

const TITLE_DATA_TEST_SUBJ = 'mockedTimeRangeTitle';

const useLoadAlertSummaryMock = useLoadAlertSummary as jest.Mock;

const dependencies: AlertSummaryWidgetDependencies['dependencies'] = {
  charts: chartPluginMock.createStartContract(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

describe('AlertSummaryWidget', () => {
  const mockedTimeRange = {
    ...mockedAlertSummaryTimeRange,
    title: <h3 data-test-subj={TITLE_DATA_TEST_SUBJ}>mockedTimeRangeTitle</h3>,
  };

  const renderComponent = (props: Partial<AlertSummaryWidgetProps> = {}) =>
    render(
      <IntlProvider locale="en">
        <AlertSummaryWidget
          chartProps={mockedChartProps}
          featureIds={['apm', 'uptime', 'logs']}
          onClick={jest.fn}
          timeRange={mockedTimeRange}
          dependencies={dependencies}
          {...props}
        />
      </IntlProvider>
    );

  it('should render AlertSummaryWidget compact version', async () => {
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetCompact')).toBeTruthy();
  });

  it('should render AlertSummaryWidget full-size version', async () => {
    const alertSummaryWidget = renderComponent({ fullSize: true });

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetFullSize')).toBeTruthy();
  });

  it('should render counts and title correctly', async () => {
    const alertSummaryWidget = renderComponent();
    expect(alertSummaryWidget.queryByTestId(ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent(
      '1'
    );
    expect(alertSummaryWidget.queryByTestId(TOTAL_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent(
      '8'
    );
    expect(alertSummaryWidget.queryByTestId(TITLE_DATA_TEST_SUBJ)).toBeTruthy();
  });

  it('should render AlertSummaryWidget when there is only active alerts', async () => {
    useLoadAlertSummaryMock.mockImplementation(() => ({
      alertSummary: {
        activeAlertCount: 1,
        activeAlerts: [{ key: 1671408000000, doc_count: 1 }],
        recoveredAlertCount: 0,
      },
      isLoading: false,
    }));
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetCompact')).toBeTruthy();
  });

  it('should render AlertSummaryWidget compact version even when there is no active and recovered alerts', async () => {
    useLoadAlertSummaryMock.mockImplementation(() => ({
      alertSummary: {
        activeAlertCount: 0,
        activeAlerts: [],
        recoveredAlertCount: 0,
      },
      isLoading: false,
    }));
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetCompact')).toBeTruthy();
  });

  it('should not render AlertSummaryWidget full-size version when there is no active and recovered alerts', async () => {
    useLoadAlertSummaryMock.mockImplementation(() => ({
      alertSummary: {
        activeAlertCount: 0,
        activeAlerts: [],
        recoveredAlertCount: 0,
      },
      isLoading: false,
    }));
    const alertSummaryWidget = renderComponent({ fullSize: true });

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetFullSzie')).toBeFalsy();
  });

  it('should render AlertSummaryWidgetError when API call fails', async () => {
    useLoadAlertSummaryMock.mockImplementation(() => ({
      alertSummary: {
        activeAlertCount: 0,
        activeAlerts: [],
        recoveredAlertCount: 0,
      },
      isLoading: false,
      error: 'Fetch Alert Summary Failed',
    }));
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetError')).toBeTruthy();
  });

  it('should render AlertSummaryWidget loading when API is loading', async () => {
    useLoadAlertSummaryMock.mockImplementation(() => ({
      alertSummary: {
        activeAlertCount: 0,
        activeAlerts: [],
        recoveredAlertCount: 0,
      },
      isLoading: true,
    }));
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetLoading')).toBeTruthy();
  });
});
