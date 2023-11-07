/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { allSeriesKey, reportTypeKey, UrlStorageContextProvider } from './use_series_storage';
import { renderHook } from '@testing-library/react-hooks';
import { useExpViewTimeRange } from './use_time_range';
import { ReportTypes } from '../configurations/constants';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  TRANSACTION_DURATION,
  METRIC_SYSTEM_MEMORY_USAGE,
} from '../configurations/constants/elasticsearch_fieldnames';

const mockSingleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
    selectedMetricField: TRANSACTION_DURATION,
    reportDefinitions: { 'service.name': ['elastic-co'] },
  },
];

const mockMultipleSeries = [
  ...mockSingleSeries,
  {
    name: 'kpi-over-time',
    dataType: 'synthetics',
    breakdown: 'user_agent.name',
    time: { from: 'now-30m', to: 'now' },
    selectedMetricField: TRANSACTION_DURATION,
    reportDefinitions: { 'service.name': ['elastic-co'] },
  },
];

describe('useExpViewTimeRange', function () {
  const storage = createKbnUrlStateStorage({ useHash: false });

  function Wrapper({ children }: { children: JSX.Element }) {
    return <UrlStorageContextProvider storage={storage}>{children}</UrlStorageContextProvider>;
  }
  it('should return expected result when there is one series', async function () {
    await storage.set(allSeriesKey, mockSingleSeries);
    await storage.set(reportTypeKey, ReportTypes.KPI);

    const { result } = renderHook(() => useExpViewTimeRange(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      from: 'now-15m',
      to: 'now',
    });
  });

  it('should return expected result when there are multiple KPI series', async function () {
    await storage.set(allSeriesKey, mockMultipleSeries);
    await storage.set(reportTypeKey, ReportTypes.KPI);

    const { result } = renderHook(() => useExpViewTimeRange(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      from: 'now-15m',
      to: 'now',
    });
  });

  it('should return expected result when there are multiple distribution series with relative dates', async function () {
    await storage.set(allSeriesKey, mockMultipleSeries);
    await storage.set(reportTypeKey, ReportTypes.DISTRIBUTION);

    const { result } = renderHook(() => useExpViewTimeRange(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      from: 'now-30m',
      to: 'now',
    });
  });

  it("should correctly parse dates when last series doesn't have a report definition", async function () {
    const mockSeriesWithoutDefinitions = [
      ...mockSingleSeries,
      {
        dataType: 'mobile',
        name: 'mobile-series-1',
        reportDefinitions: undefined,
        selectedMetricField: METRIC_SYSTEM_MEMORY_USAGE,
        time: { from: 'now-30m', to: 'now' },
      },
    ];

    await storage.set(allSeriesKey, mockSeriesWithoutDefinitions);
    await storage.set(reportTypeKey, ReportTypes.DISTRIBUTION);

    const { result } = renderHook(() => useExpViewTimeRange(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      from: 'now-30m',
      to: 'now',
    });
  });

  it('should return expected result when there are multiple distribution series with absolute dates', async function () {
    // from:'2021-10-11T09:55:39.551Z',to:'2021-10-11T10:55:41.516Z')))
    mockMultipleSeries[0].time.from = '2021-10-11T09:55:39.551Z';
    mockMultipleSeries[0].time.to = '2021-10-11T11:55:41.516Z';

    mockMultipleSeries[1].time.from = '2021-01-11T09:55:39.551Z';
    mockMultipleSeries[1].time.to = '2021-10-11T10:55:41.516Z';

    await storage.set(allSeriesKey, mockMultipleSeries);
    await storage.set(reportTypeKey, ReportTypes.DISTRIBUTION);

    const { result } = renderHook(() => useExpViewTimeRange(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      from: '2021-01-11T09:55:39.551Z',
      to: '2021-10-11T11:55:41.516Z',
    });
  });
});
