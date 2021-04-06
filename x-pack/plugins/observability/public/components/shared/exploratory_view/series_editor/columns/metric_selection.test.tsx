/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockUrlStorage, render } from '../../rtl_helpers';
import { MetricSelection } from './metric_selection';

describe('MetricSelection', function () {
  it('should render properly', function () {
    render(<MetricSelection seriesId={'series-id'} isDisabled={false} />);

    screen.getByText('Average');
  });

  it('should display selected value', function () {
    mockUrlStorage({
      data: {
        'performance-distribution': {
          reportType: 'kpi',
          metric: 'median',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<MetricSelection seriesId={'series-id'} isDisabled={false} />);

    screen.getByText('Median');
  });

  it('should be disabled on disabled state', function () {
    render(<MetricSelection seriesId={'series-id'} isDisabled={true} />);

    const btn = screen.getByRole('button');

    expect(btn.classList).toContain('euiButton-isDisabled');
  });

  it('should call set series on change', function () {
    const { setSeries } = mockUrlStorage({
      data: {
        'performance-distribution': {
          reportType: 'kpi',
          metric: 'median',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<MetricSelection seriesId={'series-id'} isDisabled={false} />);

    fireEvent.click(screen.getByText('Median'));

    screen.getByText('Chart metric group');

    fireEvent.click(screen.getByText('95th Percentile'));

    expect(setSeries).toHaveBeenNthCalledWith(1, 'performance-distribution', {
      metric: '95th',
      reportType: 'kpi',
      time: { from: 'now-15m', to: 'now' },
    });
    // FIXME This is a bug in EUI EuiButtonGroup calls on change multiple times
    // This should be one https://github.com/elastic/eui/issues/4629
    expect(setSeries).toHaveBeenCalledTimes(3);
  });

  it('should call set series on change for all series', function () {
    const { setSeries } = mockUrlStorage({
      data: {
        'page-views': {
          reportType: 'kpi',
          metric: 'median',
          time: { from: 'now-15m', to: 'now' },
        },
        'performance-distribution': {
          reportType: 'kpi',
          metric: 'median',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<MetricSelection seriesId={'series-id'} isDisabled={false} />);

    fireEvent.click(screen.getByText('Median'));

    screen.getByText('Chart metric group');

    fireEvent.click(screen.getByText('95th Percentile'));

    expect(setSeries).toHaveBeenNthCalledWith(1, 'page-views', {
      metric: '95th',
      reportType: 'kpi',
      time: { from: 'now-15m', to: 'now' },
    });

    expect(setSeries).toHaveBeenNthCalledWith(2, 'performance-distribution', {
      metric: '95th',
      reportType: 'kpi',
      time: { from: 'now-15m', to: 'now' },
    });
    // FIXME This is a bug in EUI EuiButtonGroup calls on change multiple times
    // This should be one https://github.com/elastic/eui/issues/4629
    expect(setSeries).toHaveBeenCalledTimes(6);
  });
});
