/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Router } from 'react-router-dom';
import { render } from '@testing-library/react';
import { UrlStorageContextProvider, useSeriesStorage } from './use_series_storage';
import { getHistoryFromUrl } from '../rtl_helpers';

const mockSingleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
];

const mockMultipleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
  {
    name: 'kpi-over-time',
    dataType: 'synthetics',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
];

describe('userSeriesStorage', function () {
  function setupTestComponent(seriesData: any) {
    const setData = jest.fn();

    function TestComponent() {
      const data = useSeriesStorage();

      useEffect(() => {
        setData(data);
      }, [data]);

      return <span>Test</span>;
    }

    render(
      <Router history={getHistoryFromUrl('/app/observability/exploratory-view/configure')}>
        <Route path={'/app/observability/exploratory-view/:mode'}>
          <UrlStorageContextProvider
            storage={{
              get: jest
                .fn()
                .mockImplementation((key: string) => (key === 'sr' ? seriesData : null)),
              set: jest.fn(),
            }}
          >
            <TestComponent />
          </UrlStorageContextProvider>
        </Route>
      </Router>
    );

    return setData;
  }
  it('should return expected result when there is one series', function () {
    const setData = setupTestComponent(mockSingleSeries);

    expect(setData).toHaveBeenCalledTimes(2);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: [
          {
            name: 'performance-distribution',
            dataType: 'ux',
            breakdown: 'user_agent.name',
            time: { from: 'now-15m', to: 'now' },
          },
        ],
        firstSeries: {
          name: 'performance-distribution',
          dataType: 'ux',
          breakdown: 'user_agent.name',
          time: { from: 'now-15m', to: 'now' },
        },
      })
    );
  });

  it('should return expected result when there are multiple series series', function () {
    const setData = setupTestComponent(mockMultipleSeries);

    expect(setData).toHaveBeenCalledTimes(2);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: [
          {
            name: 'performance-distribution',
            dataType: 'ux',
            breakdown: 'user_agent.name',
            time: { from: 'now-15m', to: 'now' },
          },
          {
            name: 'kpi-over-time',
            dataType: 'synthetics',
            breakdown: 'user_agent.name',
            time: { from: 'now-15m', to: 'now' },
          },
        ],
        firstSeries: {
          name: 'performance-distribution',
          dataType: 'ux',
          breakdown: 'user_agent.name',
          time: { from: 'now-15m', to: 'now' },
        },
      })
    );
  });

  it('should return expected result when there are no series', function () {
    const setData = setupTestComponent([]);

    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: [],
        firstSeries: undefined,
      })
    );
  });
});
