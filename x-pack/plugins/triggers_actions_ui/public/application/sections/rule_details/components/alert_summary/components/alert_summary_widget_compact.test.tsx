/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  AlertsSummaryWidgetCompact,
  AlertsSummaryWidgetCompactProps,
} from './alert_summary_widget_compact';
import { render } from '@testing-library/react';
import {
  mockedAlertSummaryResponse,
  mockedChartThemes,
} from '../../../../../mock/alert_summary_widget';

describe('AlertsSummaryWidgetCompact', () => {
  const renderComponent = (props: Partial<AlertsSummaryWidgetCompactProps> = {}) =>
    render(
      <IntlProvider locale="en">
        <AlertsSummaryWidgetCompact
          chartThemes={mockedChartThemes}
          onClick={jest.fn}
          {...mockedAlertSummaryResponse}
          {...props}
        />
      </IntlProvider>
    );

  it('should render AlertsSummaryWidgetCompact', async () => {
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetCompact')).toBeTruthy();
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
