/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { UrlStorageContextProvider, useSeriesStorage } from './use_series_storage';
import { render } from '@testing-library/react';

const mockSingleSeries = {
  'performance-distribution': {
    reportType: 'data-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
};

const mockMultipleSeries = {
  'performance-distribution': {
    reportType: 'data-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
  'kpi-over-time': {
    reportType: 'kpi-over-time',
    dataType: 'synthetics',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
};

describe('userSeries', function () {
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
      <UrlStorageContextProvider
        storage={{ get: jest.fn().mockReturnValue(seriesData), set: jest.fn() }}
      >
        <TestComponent />
      </UrlStorageContextProvider>
    );

    return setData;
  }
  it('should return expected result when there is one series', function () {
    const setData = setupTestComponent(mockSingleSeries);

    expect(setData).toHaveBeenCalledTimes(2);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: {
          'performance-distribution': {
            breakdown: 'user_agent.name',
            dataType: 'ux',
            reportType: 'data-distribution',
            time: { from: 'now-15m', to: 'now' },
          },
        },
        allSeriesIds: ['performance-distribution'],
        firstSeries: {
          breakdown: 'user_agent.name',
          dataType: 'ux',
          reportType: 'data-distribution',
          time: { from: 'now-15m', to: 'now' },
        },
        firstSeriesId: 'performance-distribution',
      })
    );
  });

  it('should return expected result when there are multiple series series', function () {
    const setData = setupTestComponent(mockMultipleSeries);

    expect(setData).toHaveBeenCalledTimes(2);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: {
          'performance-distribution': {
            breakdown: 'user_agent.name',
            dataType: 'ux',
            reportType: 'data-distribution',
            time: { from: 'now-15m', to: 'now' },
          },
          'kpi-over-time': {
            reportType: 'kpi-over-time',
            dataType: 'synthetics',
            breakdown: 'user_agent.name',
            time: { from: 'now-15m', to: 'now' },
          },
        },
        allSeriesIds: ['performance-distribution', 'kpi-over-time'],
        firstSeries: {
          breakdown: 'user_agent.name',
          dataType: 'ux',
          reportType: 'data-distribution',
          time: { from: 'now-15m', to: 'now' },
        },
        firstSeriesId: 'performance-distribution',
      })
    );
  });

  it('should return expected result when there are no series', function () {
    const setData = setupTestComponent({});

    expect(setData).toHaveBeenCalledTimes(2);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: {},
        allSeriesIds: [],
        firstSeries: undefined,
        firstSeriesId: undefined,
      })
    );
  });
});
