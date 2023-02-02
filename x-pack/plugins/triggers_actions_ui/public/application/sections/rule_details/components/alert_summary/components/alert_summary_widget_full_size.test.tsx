/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  AlertsSummaryWidgetFullSize,
  AlertsSummaryWidgetFullSizeProps,
} from './alert_summary_widget_full_size';
import { render } from '@testing-library/react';
import {
  mockedAlertSummaryResponse,
  mockedChartThemes,
} from '../../../../../mock/alert_summary_widget';

describe('AlertSummaryWidgetFullSize', () => {
  const renderComponent = (props: Partial<AlertsSummaryWidgetFullSizeProps> = {}) =>
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
    expect(alertSummaryWidget.queryByTestId('totalAlertsCount')).toHaveTextContent('22');
  });

  it('should render higher counts correctly', async () => {
    const alertSummaryWidget = renderComponent({
      activeAlertCount: 2000,
    });

    expect(alertSummaryWidget.queryByTestId('activeAlertsCount')).toHaveTextContent('2k');
    expect(alertSummaryWidget.queryByTestId('totalAlertsCount')).toHaveTextContent('2.02k');
  });
});
