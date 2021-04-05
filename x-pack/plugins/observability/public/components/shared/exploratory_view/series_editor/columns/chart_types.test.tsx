/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { SeriesChartTypes, XYChartTypes } from './chart_types';
import { mockUrlStorage, render } from '../../rtl_helpers';

describe.skip('SeriesChartTypes', function () {
  it('should render properly', async function () {
    mockUrlStorage({});

    render(<SeriesChartTypes seriesId={'series-id'} defaultChartType={'line'} />);

    await waitFor(() => {
      screen.getByText(/chart type/i);
    });
  });

  it('should call set series on change', async function () {
    const { setSeries } = mockUrlStorage({});

    render(<SeriesChartTypes seriesId={'series-id'} defaultChartType={'line'} />);

    await waitFor(() => {
      screen.getByText(/chart type/i);
    });

    fireEvent.click(screen.getByText(/chart type/i));
    fireEvent.click(screen.getByTestId('lnsXY_seriesType-bar_stacked'));

    expect(setSeries).toHaveBeenNthCalledWith(1, 'performance-distribution', {
      breakdown: 'user_agent.name',
      reportType: 'pld',
      seriesType: 'bar_stacked',
      time: { from: 'now-15m', to: 'now' },
    });
    expect(setSeries).toHaveBeenCalledTimes(3);
  });

  describe('XYChartTypes', function () {
    it('should render properly', async function () {
      mockUrlStorage({});

      render(<XYChartTypes value={'line'} onChange={jest.fn()} label={'Chart type'} />);

      await waitFor(() => {
        screen.getByText(/chart type/i);
      });
    });
  });
});
