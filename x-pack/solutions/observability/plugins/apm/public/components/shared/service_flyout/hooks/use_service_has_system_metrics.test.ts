/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceHasSystemMetrics } from './use_service_has_system_metrics';

const mockUseAbortableAsync = jest.fn();

jest.mock('@kbn/react-hooks', () => ({
  useAbortableAsync: (...args: unknown[]) => mockUseAbortableAsync(...args),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
  }),
}));

const mockCallApmApi = jest.fn();
jest.mock('../../../../plugin', () => ({
  getApmInternalServices: () => ({ callApmApi: mockCallApmApi }),
}));

const baseParams = {
  serviceName: 'opbeans-java',
  environment: 'production' as const,
  rangeFrom: 'now-1h',
  rangeTo: 'now',
};

describe('useServiceHasSystemMetrics', () => {
  beforeEach(() => {
    mockUseAbortableAsync.mockClear();
    mockCallApmApi.mockClear();
  });

  it('returns isLoading true and hasSystemMetrics undefined while the fetch is loading', () => {
    mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: undefined, isLoading: true });
  });

  it('returns true when the service has system metrics', () => {
    mockUseAbortableAsync.mockReturnValue({
      value: { hasSystemMetrics: true },
      loading: false,
    });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: true, isLoading: false });
  });

  it('returns false when the service has no system metrics', () => {
    mockUseAbortableAsync.mockReturnValue({
      value: { hasSystemMetrics: false },
      loading: false,
    });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: false, isLoading: false });
  });

  it('returns isLoading false when the fetch fails, so the skeleton does not get stuck', () => {
    mockUseAbortableAsync.mockReturnValue({
      value: undefined,
      loading: false,
      error: new Error('fail'),
    });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: undefined, isLoading: false });
  });

  it('calls the correct endpoint with the right params', () => {
    mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true });

    renderHook(() => useServiceHasSystemMetrics(baseParams));

    const [fetcherFn] = mockUseAbortableAsync.mock.calls[0];
    const signal = new AbortController().signal;
    fetcherFn({ signal });

    expect(mockCallApmApi).toHaveBeenCalledWith(
      'GET /internal/apm/services/{serviceName}/has_system_metrics',
      {
        params: {
          path: { serviceName: 'opbeans-java' },
          query: {
            environment: 'production',
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-01T01:00:00.000Z',
          },
        },
        signal,
      }
    );
  });
});
