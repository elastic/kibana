/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TimeRangeIdContextProvider } from './time_range_id_context';
import { useTimeRangeId } from './use_time_range_id';

function wrapper({ children }: { children: React.ReactNode }) {
  return <TimeRangeIdContextProvider>{children}</TimeRangeIdContextProvider>;
}

describe('TimeRangeIdContextProvider — auto-refresh pause', () => {
  it('starts with isAutoRefreshPaused=false', () => {
    const { result } = renderHook(() => useTimeRangeId(), { wrapper });
    expect(result.current.isAutoRefreshPaused).toBe(false);
  });

  it('pauses when pauseAutoRefresh is called', () => {
    const { result } = renderHook(() => useTimeRangeId(), { wrapper });
    act(() => {
      result.current.pauseAutoRefresh();
    });
    expect(result.current.isAutoRefreshPaused).toBe(true);
  });

  it('resumes when resumeAutoRefresh is called after pausing', () => {
    const { result } = renderHook(() => useTimeRangeId(), { wrapper });
    act(() => {
      result.current.pauseAutoRefresh();
    });
    act(() => {
      result.current.resumeAutoRefresh();
    });
    expect(result.current.isAutoRefreshPaused).toBe(false);
  });

  it('stays paused when multiple callers pause and only one resumes (ref-count)', () => {
    const { result } = renderHook(() => useTimeRangeId(), { wrapper });
    act(() => {
      result.current.pauseAutoRefresh(); // flyout A opens
      result.current.pauseAutoRefresh(); // flyout B opens
    });
    act(() => {
      result.current.resumeAutoRefresh(); // flyout A closes
    });
    expect(result.current.isAutoRefreshPaused).toBe(true);

    act(() => {
      result.current.resumeAutoRefresh(); // flyout B closes
    });
    expect(result.current.isAutoRefreshPaused).toBe(false);
  });

  it('does not go below zero on excess resume calls', () => {
    const { result } = renderHook(() => useTimeRangeId(), { wrapper });
    act(() => {
      result.current.resumeAutoRefresh();
      result.current.resumeAutoRefresh();
    });
    expect(result.current.isAutoRefreshPaused).toBe(false);
  });

  it('incrementTimeRangeId still works while paused', () => {
    const { result } = renderHook(() => useTimeRangeId(), { wrapper });
    const initialId = result.current.timeRangeId;
    act(() => {
      result.current.pauseAutoRefresh();
      result.current.incrementTimeRangeId();
    });
    expect(result.current.timeRangeId).toBe(initialId + 1);
  });
});
