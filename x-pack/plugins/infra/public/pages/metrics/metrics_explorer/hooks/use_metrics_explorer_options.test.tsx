/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useMetricsExplorerOptions,
  MetricsExplorerOptionsContainer,
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  DEFAULT_OPTIONS,
  DEFAULT_TIMERANGE,
} from './use_metrics_explorer_options';

const renderUseMetricsExplorerOptionsHook = () =>
  renderHook(() => useMetricsExplorerOptions(), {
    initialProps: {},
    wrapper: ({ children }) => (
      <MetricsExplorerOptionsContainer.Provider>
        {children}
      </MetricsExplorerOptionsContainer.Provider>
    ),
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

describe('useMetricExplorerOptions', () => {
  beforeEach(() => {
    delete STORE.MetricsExplorerOptions;
    delete STORE.MetricsExplorerTimeRange;
  });

  it('should just work', () => {
    const { result } = renderUseMetricsExplorerOptionsHook();
    expect(result.current.options).toEqual(DEFAULT_OPTIONS);
    expect(result.current.currentTimerange).toEqual(DEFAULT_TIMERANGE);
    expect(result.current.isAutoReloading).toEqual(false);
    expect(STORE.MetricsExplorerOptions).toEqual(JSON.stringify(DEFAULT_OPTIONS));
    expect(STORE.MetricsExplorerTimeRange).toEqual(JSON.stringify(DEFAULT_TIMERANGE));
  });

  it('should change the store when options update', () => {
    const { result, rerender } = renderUseMetricsExplorerOptionsHook();
    const newOptions: MetricsExplorerOptions = {
      ...DEFAULT_OPTIONS,
      metrics: [{ aggregation: 'count' }],
    };
    act(() => {
      result.current.setOptions(newOptions);
    });
    rerender();
    expect(result.current.options).toEqual(newOptions);
    expect(STORE.MetricsExplorerOptions).toEqual(JSON.stringify(newOptions));
  });

  it('should change the store when timerange update', () => {
    const { result, rerender } = renderUseMetricsExplorerOptionsHook();
    const newTimeRange: MetricsExplorerTimeOptions = {
      ...DEFAULT_TIMERANGE,
      from: 'now-15m',
    };
    act(() => {
      result.current.setTimeRange(newTimeRange);
    });
    rerender();
    expect(result.current.currentTimerange).toEqual(newTimeRange);
    expect(STORE.MetricsExplorerTimeRange).toEqual(JSON.stringify(newTimeRange));
  });

  it('should load from store when available', () => {
    const newOptions: MetricsExplorerOptions = {
      ...DEFAULT_OPTIONS,
      metrics: [{ aggregation: 'avg', field: 'system.load.1' }],
    };
    STORE.MetricsExplorerOptions = JSON.stringify(newOptions);
    const { result } = renderUseMetricsExplorerOptionsHook();
    expect(result.current.options).toEqual(newOptions);
  });
});
