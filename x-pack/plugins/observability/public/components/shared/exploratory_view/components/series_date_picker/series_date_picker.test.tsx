/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockUseHasData, render } from '../../rtl_helpers';
import { fireEvent, waitFor } from '@testing-library/react';
import { SeriesDatePicker } from '.';

describe('SeriesDatePicker', function () {
  it('should render properly', function () {
    const initSeries = {
      data: [
        {
          name: 'uptime-pings-histogram',
          dataType: 'synthetics' as const,
          breakdown: 'monitor.status',
          time: { from: 'now-30m', to: 'now' },
        },
      ],
    };
    const { getByText } = render(<SeriesDatePicker seriesId={0} series={initSeries.data[0]} />, {
      initSeries,
    });

    getByText('Last 30 minutes');
  });

  it('should set series data', async function () {
    const initSeries = {
      data: [
        {
          name: 'uptime-pings-histogram',
          dataType: 'synthetics' as const,
          breakdown: 'monitor.status',
          time: { from: 'now-30m', to: 'now' },
        },
      ],
    };

    const { onRefreshTimeRange } = mockUseHasData();
    const { getByTestId, setSeries } = render(
      <SeriesDatePicker seriesId={0} series={initSeries.data[0]} />,
      {
        initSeries,
      }
    );

    await waitFor(function () {
      fireEvent.click(getByTestId('superDatePickerToggleQuickMenuButton'));
    });

    fireEvent.click(getByTestId('superDatePickerCommonlyUsed_Today'));

    expect(onRefreshTimeRange).toHaveBeenCalledTimes(1);

    expect(setSeries).toHaveBeenCalledWith(0, {
      name: 'uptime-pings-histogram',
      breakdown: 'monitor.status',
      dataType: 'synthetics',
      time: { from: 'now/d', to: 'now/d' },
    });
    expect(setSeries).toHaveBeenCalledTimes(1);
  });
});
