/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockUrlStorage, mockUseHasData, render } from '../rtl_helpers';
import { fireEvent, waitFor } from '@testing-library/react';
import { SeriesDatePicker } from './index';
import { DEFAULT_TIME } from '../configurations/constants';

describe('SeriesDatePicker', function () {
  it('should render properly', function () {
    mockUrlStorage({
      data: {
        'uptime-pings-histogram': {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-30m', to: 'now' },
        },
      },
    });
    const { getByText } = render(<SeriesDatePicker seriesId={'series-id'} />);

    getByText('Last 30 minutes');
  });

  it('should set defaults', async function () {
    const { setSeries: setSeries1 } = mockUrlStorage({
      data: {
        'uptime-pings-histogram': {
          reportType: 'upp',
          dataType: 'synthetics',
          breakdown: 'monitor.status',
        },
      },
    } as any);
    render(<SeriesDatePicker seriesId={'uptime-pings-histogram'} />);
    expect(setSeries1).toHaveBeenCalledTimes(1);
    expect(setSeries1).toHaveBeenCalledWith('uptime-pings-histogram', {
      breakdown: 'monitor.status',
      dataType: 'synthetics',
      reportType: 'upp',
      time: DEFAULT_TIME,
    });
  });

  it('should set series data', async function () {
    const { setSeries } = mockUrlStorage({
      data: {
        'uptime-pings-histogram': {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-30m', to: 'now' },
        },
      },
    });

    const { onRefreshTimeRange } = mockUseHasData();
    const { getByTestId } = render(<SeriesDatePicker seriesId={'series-id'} />);

    await waitFor(function () {
      fireEvent.click(getByTestId('superDatePickerToggleQuickMenuButton'));
    });

    fireEvent.click(getByTestId('superDatePickerCommonlyUsed_Today'));

    expect(onRefreshTimeRange).toHaveBeenCalledTimes(1);

    expect(setSeries).toHaveBeenCalledWith('series-id', {
      breakdown: 'monitor.status',
      dataType: 'synthetics',
      reportType: 'upp',
      time: { from: 'now/d', to: 'now/d' },
    });
    expect(setSeries).toHaveBeenCalledTimes(1);
  });
});
