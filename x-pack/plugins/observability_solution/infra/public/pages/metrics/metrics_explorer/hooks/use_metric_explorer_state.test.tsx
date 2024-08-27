/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useMetricsExplorerState } from './use_metric_explorer_state';
import { MetricsExplorerOptionsContainer } from './use_metrics_explorer_options';
import React from 'react';
import { resp, createSeries } from '../../../../utils/fixtures/metrics_explorer';

jest.mock('../../../../hooks/use_kibana_timefilter_time', () => ({
  useKibanaTimefilterTime: (defaults: { from: string; to: string }) => [() => defaults],
  useSyncKibanaTimeFilterTime: () => [() => {}],
}));

jest.mock('../../../../alerting/use_alert_prefill', () => ({
  useAlertPrefillContext: () => ({
    metricThresholdPrefill: {
      setPrefillOptions: jest.fn(),
    },
  }),
}));

const renderUseMetricsExplorerStateHook = () =>
  renderHook(() => useMetricsExplorerState(), {
    wrapper: ({ children }: React.PropsWithChildren<{}>) => (
      <MetricsExplorerOptionsContainer>{children}</MetricsExplorerOptionsContainer>
    ),
  });

const mockedUseMetricsExplorerData = jest.fn();

jest.mock('./use_metrics_explorer_data', () => {
  return {
    useMetricsExplorerData: () => {
      return mockedUseMetricsExplorerData();
    },
  };
});

interface LocalStore {
  [key: string]: string;
}

interface LocalStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORE: LocalStore = {};
const localStorageMock: LocalStorage = {
  getItem: (key: string) => {
    return STORE[key] || null;
  },
  setItem: (key: string, value: any) => {
    STORE[key] = value.toString();
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useMetricsExplorerState', () => {
  beforeEach(() => {
    mockedUseMetricsExplorerData.mockReturnValue({
      isLoading: false,
      error: null,
      data: null,
    });
    delete STORE.MetricsExplorerOptions;
    delete STORE.MetricsExplorerTimeRange;
  });

  it('should just work', async () => {
    mockedUseMetricsExplorerData.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        pages: [resp],
      },
    });
    const { result } = renderUseMetricsExplorerStateHook();
    expect(result.current.data!.pages[0]).toEqual(resp);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  describe('handleRefresh', () => {
    it('should trigger an addition request when handleRefresh is called', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      expect(result.all.length).toBe(2);
      const numberOfHookCalls = result.all.length;
      act(() => {
        result.current.refresh();
      });
      expect(result.all.length).toBe(numberOfHookCalls + 1);
    });
  });

  describe('handleMetricsChange', () => {
    it('should change the metric', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleMetricsChange } = result.current;
      act(() => {
        handleMetricsChange([{ aggregation: 'max', field: 'system.load.1' }]);
      });
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'max', field: 'system.load.1' },
      ]);
    });
  });

  describe('handleGroupByChange', () => {
    it('should change the metric', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleGroupByChange } = result.current;
      act(() => {
        handleGroupByChange('host.name');
      });
      expect(result.current.options.groupBy).toBeDefined();
      expect(result.current.options.groupBy).toBe('host.name');
    });
  });

  describe('handleTimeChange', () => {
    it('should change the time range', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleTimeChange } = result.current;
      act(() => {
        handleTimeChange('now-10m', 'now');
      });
      expect(result.current.timeRange).toEqual({
        from: 'now-10m',
        to: 'now',
        interval: '>=10s',
      });
    });
  });

  describe('handleFilterQuerySubmit', () => {
    it('should set the filter query', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleFilterQuerySubmit } = result.current;
      act(() => {
        handleFilterQuerySubmit('host.name: "example-host-01"');
      });
      expect(result.current.options.filterQuery).toBe('host.name: "example-host-01"');
    });
  });

  describe('handleAggregationChange', () => {
    it('should set the metrics to only count when selecting count', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleMetricsChange } = result.current;
      act(() => {
        handleMetricsChange([{ aggregation: 'avg', field: 'system.load.1' }]);
      });
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'avg', field: 'system.load.1' },
      ]);
      const { handleAggregationChange } = result.current;
      act(() => {
        handleAggregationChange('count');
      });
      expect(result.current.options.aggregation).toBe('count');
      expect(result.current.options.metrics).toEqual([{ aggregation: 'count' }]);
    });

    it('should change aggregation for metrics', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      const { handleMetricsChange } = result.current;
      act(() => {
        handleMetricsChange([{ aggregation: 'avg', field: 'system.load.1' }]);
      });
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'avg', field: 'system.load.1' },
      ]);
      const { handleAggregationChange } = result.current;
      act(() => {
        handleAggregationChange('max');
      });
      expect(result.current.options.aggregation).toBe('max');
      expect(result.current.options.metrics).toEqual([
        { aggregation: 'max', field: 'system.load.1' },
      ]);
    });
  });

  describe('handleLoadMore', () => {
    it('should load more based on the afterKey', async () => {
      const { result, rerender } = renderUseMetricsExplorerStateHook();
      expect(result.current.data).toBe(null);
      expect(result.current.isLoading).toBe(false);
      mockedUseMetricsExplorerData.mockReturnValue({
        isLoading: false,
        error: null,
        data: {
          pages: [resp],
        },
      });
      await rerender();
      const { series } = result.current.data!.pages[0];
      expect(series).toBeDefined();
      expect(series.length).toBe(3);
      const fetchNextPage = jest.fn();
      mockedUseMetricsExplorerData.mockReturnValue({
        isLoading: false,
        error: null,
        data: {
          pageInfo: { total: 10, afterKey: 'host-06' },
          series: [createSeries('host-04'), createSeries('host-05'), createSeries('host-06')],
        } as any,
        fetchNextPage,
      });
      await rerender();
      const { handleLoadMore } = result.current;
      act(() => {
        handleLoadMore();
      });
      expect(fetchNextPage).toBeCalledTimes(1);
    });
  });
});
