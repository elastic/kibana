/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import { render } from '../rtl_helpers';
import * as hooks from '../hooks/use_series_storage';
import { ViewActions } from './view_actions';
import { AllSeries } from '../hooks/use_series_storage';

describe('ViewActions', () => {
  const applyChanges = jest.fn();

  const mockSeriesStorage = (allSeries: AllSeries, urlAllSeries: AllSeries) => {
    jest.clearAllMocks();
    jest.spyOn(hooks, 'useSeriesStorage').mockReturnValue({
      ...jest.requireActual('../hooks/use_series_storage'),
      allSeries,
      applyChanges,
      storage: { get: jest.fn().mockReturnValue(urlAllSeries) } as any,
    });
  };

  const assertApplyIsEnabled = async () => {
    render(<ViewActions />);

    const applyBtn = screen.getByText(/Apply changes/i);

    const btnComponent = screen.getByTestId('seriesChangesApplyButton');

    expect(btnComponent.classList).not.toContain('euiButton-isDisabled');

    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyChanges).toBeCalledTimes(1);
    });
  };

  it('renders ViewActions', async () => {
    mockSeriesStorage([], []);
    render(<ViewActions />);

    expect(screen.getByText(/Apply changes/i)).toBeInTheDocument();
  });

  it('apply button is disabled when no changes', async () => {
    mockSeriesStorage([], []);

    render(<ViewActions />);
    const applyBtn = screen.getByText(/Apply changes/i);

    const btnComponent = screen.getByTestId('seriesChangesApplyButton');

    expect(btnComponent.classList).toContain('euiButton-isDisabled');

    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyChanges).toBeCalledTimes(0);
    });
  });

  it('should call apply changes when series length is different', async function () {
    mockSeriesStorage([], [{ name: 'testSeries' } as any]);

    await assertApplyIsEnabled();
  });

  it('should call apply changes when series content is different', async function () {
    mockSeriesStorage([{ name: 'testSeriesChange' } as any], [{ name: 'testSeries' } as any]);

    await assertApplyIsEnabled();
  });

  it('should call apply changes when series content is different as in undefined', async function () {
    mockSeriesStorage(
      [{ name: undefined } as any],
      [{ name: 'testSeries', operationType: undefined } as any]
    );

    await assertApplyIsEnabled();
  });
  it('apply button is disabled when no filter changes but different orders', async () => {
    const allSeries: AllSeries = [
      {
        seriesType: 'area',
        breakdown: 'monitor.type',
        filters: [
          {
            values: ['spa-heartbeat', 'nyc-heartbeat', 'au-heartbeat'],
            field: 'observer.geo.name',
          },
        ],
        time: { from: 'now-15m', to: 'now' },
        dataType: 'synthetics',
        reportDefinitions: { 'monitor.name': [], 'url.full': ['ALL_VALUES'] },
        selectedMetricField: 'monitor.duration.us',
        name: 'All monitors response duration',
      },
    ];

    const urlSeries: AllSeries = [
      {
        seriesType: 'area',
        breakdown: 'monitor.type',
        filters: [
          {
            field: 'observer.geo.name',
            values: ['spa-heartbeat', 'nyc-heartbeat', 'au-heartbeat'],
            notValues: undefined,
            notWildcards: undefined,
          },
        ],
        time: { from: 'now-15m', to: 'now' },
        reportDefinitions: { 'monitor.name': [], 'url.full': ['ALL_VALUES'] },
        dataType: 'synthetics',
        selectedMetricField: 'monitor.duration.us',
        name: 'All monitors response duration',
      },
    ];

    mockSeriesStorage(allSeries, urlSeries);

    render(<ViewActions />);
    const applyBtn = screen.getByText(/Apply changes/i);

    const btnComponent = screen.getByTestId('seriesChangesApplyButton');

    expect(btnComponent.classList).toContain('euiButton-isDisabled');

    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyChanges).toBeCalledTimes(0);
    });
  });
});
