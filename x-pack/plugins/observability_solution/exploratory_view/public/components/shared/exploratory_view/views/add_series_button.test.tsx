/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../rtl_helpers';
import { AddSeriesButton } from './add_series_button';
import { DEFAULT_TIME, ReportTypes } from '../configurations/constants';
import * as hooks from '../hooks/use_series_storage';

const setSeries = jest.fn();

describe('AddSeriesButton', () => {
  beforeEach(() => {
    jest.spyOn(hooks, 'useSeriesStorage').mockReturnValue({
      ...jest.requireActual('../hooks/use_series_storage'),
      allSeries: [],
      setSeries,
      reportType: ReportTypes.KPI,
    });
    setSeries.mockClear();
  });

  it('renders AddSeriesButton', async () => {
    render(<AddSeriesButton />);

    expect(screen.getByText(/Add series/i)).toBeInTheDocument();
  });

  it('calls setSeries when AddSeries Button is clicked', async () => {
    const { rerender } = render(<AddSeriesButton />);
    let addSeriesButton = screen.getByText(/Add series/i);

    fireEvent.click(addSeriesButton);

    await waitFor(() => {
      expect(setSeries).toBeCalledTimes(1);
      expect(setSeries).toBeCalledWith(0, { name: 'new-series-1', time: DEFAULT_TIME });
    });

    jest.clearAllMocks();
    jest.spyOn(hooks, 'useSeriesStorage').mockReturnValue({
      ...jest.requireActual('../hooks/use_series_storage'),
      allSeries: new Array(1),
      setSeries,
      reportType: ReportTypes.KPI,
    });

    rerender(<AddSeriesButton />);

    addSeriesButton = screen.getByText(/Add series/i);

    fireEvent.click(addSeriesButton);

    await waitFor(() => {
      expect(setSeries).toBeCalledTimes(1);
      expect(setSeries).toBeCalledWith(1, { name: 'new-series-2', time: DEFAULT_TIME });
    });
  });

  it.each([ReportTypes.DEVICE_DISTRIBUTION, ReportTypes.CORE_WEB_VITAL])(
    'does not allow adding more than 1 series for core web vitals or device distribution',
    async (reportType) => {
      jest.clearAllMocks();
      jest.spyOn(hooks, 'useSeriesStorage').mockReturnValue({
        ...jest.requireActual('../hooks/use_series_storage'),
        allSeries: new Array(1), // mock array of length 1
        setSeries,
        reportType,
      });

      render(<AddSeriesButton />);
      const addSeriesButton = screen.getByText(/Add series/i);
      expect(addSeriesButton.closest('button')).toBeDisabled();

      fireEvent.click(addSeriesButton);

      await waitFor(() => {
        expect(setSeries).toBeCalledTimes(0);
      });
    }
  );

  it('does not allow adding a series when the report type is undefined', async () => {
    jest.clearAllMocks();
    jest.spyOn(hooks, 'useSeriesStorage').mockReturnValue({
      ...jest.requireActual('../hooks/use_series_storage'),
      allSeries: [],
      setSeries,
    });

    render(<AddSeriesButton />);
    const addSeriesButton = screen.getByText(/Add series/i);
    expect(addSeriesButton.closest('button')).toBeDisabled();

    fireEvent.click(addSeriesButton);

    await waitFor(() => {
      expect(setSeries).toBeCalledTimes(0);
    });
  });
});
