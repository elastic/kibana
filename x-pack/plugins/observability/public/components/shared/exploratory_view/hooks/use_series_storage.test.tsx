/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Route, Router } from 'react-router-dom';
import { render } from '@testing-library/react';
import { UrlStorageContextProvider, useSeriesStorage, reportTypeKey } from './use_series_storage';
import { getHistoryFromUrl } from '../rtl_helpers';
import type { AppDataType } from '../types';
import { ReportTypes } from '../configurations/constants';
import * as useTrackMetric from '../../../../hooks/use_track_metric';

const mockSingleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux' as AppDataType,
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
  },
];

const mockMultipleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux' as AppDataType,
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
    filters: [
      {
        field: 'url.full',
        value: 'https://elastic.co',
      },
    ],
    selectedMetricField: 'transaction.duration.us',
  },
  {
    name: 'kpi-over-time',
    dataType: 'synthetics' as AppDataType,
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
    filters: [
      {
        field: 'monitor.type',
        value: 'browser',
      },
    ],
    selectedMetricField: 'monitor.duration.us',
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

  it('should return expected result when there are multiple series', function () {
    const setData = setupTestComponent(mockMultipleSeries);

    expect(setData).toHaveBeenCalledTimes(2);
    expect(setData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allSeries: mockMultipleSeries,
        firstSeries: mockMultipleSeries[0],
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

  it('ensures that only one series has a breakdown', () => {
    function wrapper({ children }: { children: React.ReactElement }) {
      return (
        <UrlStorageContextProvider
          storage={{
            get: jest
              .fn()
              .mockImplementation((key: string) => (key === 'sr' ? mockMultipleSeries : null)),
            set: jest.fn(),
          }}
        >
          {children}
        </UrlStorageContextProvider>
      );
    }
    const { result } = renderHook(() => useSeriesStorage(), { wrapper });

    act(() => {
      result.current.setSeries(1, mockMultipleSeries[1]);
    });

    expect(result.current.allSeries).toEqual([
      mockMultipleSeries[0],
      {
        ...mockMultipleSeries[1],
        breakdown: undefined,
      },
    ]);
  });

  it('sets reportType when calling applyChanges', () => {
    const setStorage = jest.fn();
    function wrapper({ children }: { children: React.ReactElement }) {
      return (
        <UrlStorageContextProvider
          storage={{
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                key === 'sr' ? mockMultipleSeries : 'kpi-over-time'
              ),
            set: setStorage,
          }}
        >
          {children}
        </UrlStorageContextProvider>
      );
    }
    const { result } = renderHook(() => useSeriesStorage(), { wrapper });

    act(() => {
      result.current.setReportType(ReportTypes.DISTRIBUTION);
    });

    act(() => {
      result.current.applyChanges();
    });

    expect(setStorage).toBeCalledWith(reportTypeKey, ReportTypes.DISTRIBUTION);
  });

  it('returns reportType in state, not url storage, from hook', () => {
    const setStorage = jest.fn();
    function wrapper({ children }: { children: React.ReactElement }) {
      return (
        <UrlStorageContextProvider
          storage={{
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                key === 'sr' ? mockMultipleSeries : 'kpi-over-time'
              ),
            set: setStorage,
          }}
        >
          {children}
        </UrlStorageContextProvider>
      );
    }
    const { result } = renderHook(() => useSeriesStorage(), { wrapper });

    act(() => {
      result.current.setReportType(ReportTypes.DISTRIBUTION);
    });

    expect(result.current.reportType).toEqual(ReportTypes.DISTRIBUTION);
  });

  it('ensures that telemetry is called', () => {
    const trackEvent = jest.fn();
    jest.spyOn(useTrackMetric, 'useUiTracker').mockReturnValue(trackEvent);
    function wrapper({ children }: { children: React.ReactElement }) {
      return (
        <UrlStorageContextProvider
          storage={{
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                key === 'sr' ? mockMultipleSeries : 'kpi-over-time'
              ),
            set: jest.fn(),
          }}
        >
          {children}
        </UrlStorageContextProvider>
      );
    }
    const { result } = renderHook(() => useSeriesStorage(), { wrapper });

    act(() => {
      result.current.applyChanges();
    });

    expect(trackEvent).toBeCalledTimes(7);
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view__filters__filter_url.full',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view__filters__filter_monitor.type',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view__filters__report_type_kpi-over-time__data_type_ux__filter_url.full',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric:
        'exploratory_view__filters__report_type_kpi-over-time__data_type_synthetics__filter_monitor.type',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric:
        'exploratory_view__report_type_kpi-over-time__data_type_synthetics__metric_type_monitor.duration.us',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric:
        'exploratory_view__report_type_kpi-over-time__data_type_ux__metric_type_transaction.duration.us',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view_apply_changes',
      metricType: 'count',
    });
  });
});
