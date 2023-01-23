/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertsSummaryWidgetFullSize } from './alert_summary_widget_full_size';
import { render } from '@testing-library/react';
import { AlertSummaryWidgetProps } from '..';
import {
  mockedAlertSummaryResponse,
  mockedChartThemes,
} from '../../../../../mock/alert_summary_widget';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: jest.fn(() => false),
}));

describe('AlertSummaryWidgetFullSize', () => {
  const renderComponent = (props: Partial<AlertSummaryWidgetProps> = {}) =>
    render(
      <IntlProvider locale="en">
        <AlertsSummaryWidgetFullSize
          chartThemes={mockedChartThemes}
          {...mockedAlertSummaryResponse}
          {...props}
        />
      </IntlProvider>
    );

  it('should render AlertSummaryWidgetFullSize', async () => {
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetFullSize')).toBeTruthy();
  });

  it('should render counts correctly', async () => {
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('activeAlertsCount')).toHaveTextContent('2');
    expect(alertSummaryWidget.queryByTestId('recoveredAlertsCount')).toHaveTextContent('15');
    expect(alertSummaryWidget.queryByTestId('totalAlertsCount')).toHaveTextContent('17');
  });
});
