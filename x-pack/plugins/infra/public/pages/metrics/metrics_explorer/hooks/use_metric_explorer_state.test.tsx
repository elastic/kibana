/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useMetricsExplorerState } from './use_metric_explorer_state';
import { MetricsExplorerOptionsContainer } from './use_metrics_explorer_options';
import React from 'react';
import {
  source,
  derivedIndexPattern,
  resp,
  createSeries,
} from '../../../../utils/fixtures/metrics_explorer';

const renderUseMetricsExplorerStateHook = () =>
  renderHook((props) => useMetricsExplorerState(props.source, props.derivedIndexPattern), {
    initialProps: { source, derivedIndexPattern },
    wrapper: ({ children }) => (
      <MetricsExplorerOptionsContainer.Provider>
        {children}
      </MetricsExplorerOptionsContainer.Provider>
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
      loading: false,
      error: null,
      data: null,
    });
    delete STORE.MetricsExplorerOptions;
    delete STORE.MetricsExplorerTimeRange;
  });

  it('should just work', async () => {
    mockedUseMetricsExplorerData.mockReturnValue({
      loading: true,
      error: null,
      data: resp,
    });
    const { result } = renderUseMetricsExplorerStateHook();
    expect(result.current.data).toEqual(resp);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(true);
  });

  describe('handleRefresh', () => {
    it('should trigger an addition request when handleRefresh is called', async () => {
      const { result } = renderUseMetricsExplorerStateHook();
      expect(result.current.refreshSignal).toBe(0);
      act(() => {
        result.current.handleRefresh();
      });
      expect(result.current.afterKey).toBe(null);
      expect(result.current.refreshSignal).toBe(1);
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
      expect(result.current.currentTimerange).toEqual({
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
      expect(result.current.loading).toBe(false);
      mockedUseMetricsExplorerData.mockReturnValue({
        loading: false,
        error: null,
        data: resp,
      });
      await rerender();
      const { series, pageInfo } = result.current.data!;
      expect(series).toBeDefined();
      expect(series.length).toBe(3);
      mockedUseMetricsExplorerData.mockReturnValue({
        loading: false,
        error: null,
        data: {
          pageInfo: { total: 10, afterKey: 'host-06' },
          series: [createSeries('host-04'), createSeries('host-05'), createSeries('host-06')],
        } as any,
      });
      await rerender();
      const { handleLoadMore } = result.current;
      act(() => {
        handleLoadMore(pageInfo.afterKey!);
      });
      expect(result.current.afterKey).toBe(pageInfo.afterKey);
    });
  });
});
