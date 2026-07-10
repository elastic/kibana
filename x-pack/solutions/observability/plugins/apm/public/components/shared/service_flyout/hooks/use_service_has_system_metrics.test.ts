/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useServiceHasSystemMetrics } from './use_service_has_system_metrics';

const mockUseFetcher = jest.fn();

jest.mock('../../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  isPending: (status: string) => status === 'loading' || status === 'not_initiated',
  useFetcher: (...args: unknown[]) => mockUseFetcher(...args),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
  }),
}));

const baseParams = {
  serviceName: 'opbeans-java',
  environment: 'production' as const,
  rangeFrom: 'now-1h',
  rangeTo: 'now',
};

describe('useServiceHasSystemMetrics', () => {
  beforeEach(() => {
    mockUseFetcher.mockClear();
  });

  it('returns isLoading true and hasSystemMetrics undefined while the fetch is loading', () => {
    mockUseFetcher.mockReturnValue({ data: undefined, status: FETCH_STATUS.LOADING });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: undefined, isLoading: true });
  });

  it('returns isLoading true when the fetch has not yet been initiated', () => {
    mockUseFetcher.mockReturnValue({ data: undefined, status: FETCH_STATUS.NOT_INITIATED });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: undefined, isLoading: true });
  });

  it('returns true when the service has system metrics', () => {
    mockUseFetcher.mockReturnValue({
      data: { hasSystemMetrics: true },
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: true, isLoading: false });
  });

  it('returns false when the service has no system metrics', () => {
    mockUseFetcher.mockReturnValue({
      data: { hasSystemMetrics: false },
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: false, isLoading: false });
  });

  it('returns isLoading false when the fetch fails, so the skeleton does not get stuck', () => {
    mockUseFetcher.mockReturnValue({ data: undefined, status: FETCH_STATUS.FAILURE });

    const { result } = renderHook(() => useServiceHasSystemMetrics(baseParams));

    expect(result.current).toEqual({ hasSystemMetrics: undefined, isLoading: false });
  });

  it('calls the correct endpoint with the right params', () => {
    mockUseFetcher.mockReturnValue({ data: undefined, status: FETCH_STATUS.LOADING });

    renderHook(() => useServiceHasSystemMetrics(baseParams));

    const [fetcherFn] = mockUseFetcher.mock.calls[0];
    const mockCallApmApi = jest.fn().mockResolvedValue({ hasSystemMetrics: true });
    fetcherFn(mockCallApmApi);

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
      }
    );
  });
});
