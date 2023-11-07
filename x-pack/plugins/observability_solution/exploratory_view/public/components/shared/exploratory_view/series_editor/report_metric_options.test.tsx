/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockAppDataView, mockDataView, mockUxSeries, render } from '../rtl_helpers';
import { getDefaultConfigs } from '../configurations/default_configs';
import { PERCENTILE } from '../configurations/constants';
import { ReportMetricOptions } from './report_metric_options';
import { obsvReportConfigMap } from '../obsv_exploratory_view';

describe('ReportMetricOptions', function () {
  const dataViewSeries = getDefaultConfigs({
    dataType: 'ux',
    reportType: 'kpi-over-time',
    dataView: mockDataView,
    reportConfigMap: obsvReportConfigMap,
  });

  it('should render properly', async function () {
    render(
      <ReportMetricOptions seriesId={0} seriesConfig={dataViewSeries} series={mockUxSeries} />
    );

    expect(await screen.findByText('No data available')).toBeInTheDocument();
  });

  it('should display loading if index pattern is not available and is loading', async function () {
    mockAppDataView({ loading: true, dataViews: undefined });
    const { container } = render(
      <ReportMetricOptions
        seriesId={0}
        seriesConfig={{ ...dataViewSeries, hasOperationType: true }}
        series={{ ...mockUxSeries, breakdown: PERCENTILE }}
      />
    );

    expect(container.getElementsByClassName('euiLoadingSpinner').length).toBe(1);
  });

  it('should not display loading if index pattern is already loaded', async function () {
    mockAppDataView({ loading: true });
    render(
      <ReportMetricOptions
        seriesId={0}
        seriesConfig={{ ...dataViewSeries, hasOperationType: true }}
        series={{ ...mockUxSeries, breakdown: PERCENTILE }}
      />
    );

    expect(await screen.findByText('Page load time')).toBeInTheDocument();
  });

  it('should include a tooltip for the report metric', async function () {
    mockAppDataView({ loading: false });
    const { getByText, findByText } = render(
      <ReportMetricOptions
        seriesId={0}
        seriesConfig={{ ...dataViewSeries }}
        series={{ ...mockUxSeries }}
      />
    );

    userEvent.hover(getByText('Page load time'));

    // The tooltip from EUI takes 250ms to appear, so we must
    // use a `find*` query to asynchronously poll for it.
    expect(await findByText('Report metric')).toBeInTheDocument();
  });
});
