/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockUseHasData, render } from '../rtl_helpers';
import { fireEvent, waitFor } from '@testing-library/react';
import { SeriesDatePicker } from './index';
import { DEFAULT_TIME } from '../configurations/constants';

describe('SeriesDatePicker', function () {
  it('should render properly', function () {
    const initSeries = {
      data: {
        'uptime-pings-histogram': {
          dataType: 'synthetics' as const,
          reportType: 'dist' as const,
          breakdown: 'monitor.status',
          time: { from: 'now-30m', to: 'now' },
        },
      },
    };
    const { getByText } = render(<SeriesDatePicker seriesId={'series-id'} />, { initSeries });

    getByText('Last 30 minutes');
  });

  it('should set defaults', async function () {
    const initSeries = {
      data: {
        'uptime-pings-histogram': {
          reportType: 'kpi' as const,
          dataType: 'synthetics' as const,
          breakdown: 'monitor.status',
        },
      },
    };
    const { setSeries: setSeries1 } = render(
      <SeriesDatePicker seriesId={'uptime-pings-histogram'} />,
      { initSeries: initSeries as any }
    );
    expect(setSeries1).toHaveBeenCalledTimes(1);
    expect(setSeries1).toHaveBeenCalledWith('uptime-pings-histogram', {
      breakdown: 'monitor.status',
      dataType: 'synthetics' as const,
      reportType: 'kpi' as const,
      time: DEFAULT_TIME,
    });
  });

  it('should set series data', async function () {
    const initSeries = {
      data: {
        'uptime-pings-histogram': {
          dataType: 'synthetics' as const,
          reportType: 'kpi' as const,
          breakdown: 'monitor.status',
          time: { from: 'now-30m', to: 'now' },
        },
      },
    };

    const { onRefreshTimeRange } = mockUseHasData();
    const { getByTestId, setSeries } = render(<SeriesDatePicker seriesId={'series-id'} />, {
      initSeries,
    });

    await waitFor(function () {
      fireEvent.click(getByTestId('superDatePickerToggleQuickMenuButton'));
    });

    fireEvent.click(getByTestId('superDatePickerCommonlyUsed_Today'));

    expect(onRefreshTimeRange).toHaveBeenCalledTimes(1);

    expect(setSeries).toHaveBeenCalledWith('series-id', {
      breakdown: 'monitor.status',
      dataType: 'synthetics',
      reportType: 'kpi',
      time: { from: 'now/d', to: 'now/d' },
    });
    expect(setSeries).toHaveBeenCalledTimes(1);
  });
});
