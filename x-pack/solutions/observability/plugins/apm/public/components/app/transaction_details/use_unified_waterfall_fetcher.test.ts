/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useUnifiedWaterfallFetcher } from './use_unified_waterfall_fetcher';
import * as useFetcherModule from '../../../hooks/use_fetcher';
import * as useKibanaModule from '../../../context/kibana_context/use_kibana';

describe('useUnifiedWaterfallFetcher', () => {
  const mockUseFetcher = jest.spyOn(useFetcherModule, 'useFetcher');
  const mockUseKibana = jest.spyOn(useKibanaModule, 'useKibana');

  beforeEach(() => {
    jest.clearAllMocks();
    // By default, useUnified = true (enabled) for most tests
    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn().mockReturnValue(true),
        },
      },
    } as any);
  });

  it('returns initial data when fetch has not started', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: useFetcherModule.FETCH_STATUS.NOT_INITIATED,
      error: undefined,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useUnifiedWaterfallFetcher({
        start: '2025-01-15T00:00:00.000Z',
        end: '2025-01-15T01:00:00.000Z',
        traceId: undefined,
      })
    );

    expect(result.current.traceItems).toEqual([]);
    expect(result.current.errors).toEqual([]);
    expect(result.current.agentMarks).toEqual({});
    expect(result.current.entryTransaction).toBeUndefined();
    expect(result.current.status).toBe(useFetcherModule.FETCH_STATUS.NOT_INITIATED);
  });

  it('returns data when fetch is successful', () => {
    const mockData = {
      traceItems: [
        {
          id: 'span-1',
          name: 'Test Span',
          timestampUs: 1000000,
          traceId: 'trace-123',
          duration: 500000,
          errors: [],
          serviceName: 'test-service',
          spanLinksCount: { incoming: 0, outgoing: 0 },
          docType: 'span' as const,
        },
      ],
      errors: [],
      agentMarks: { domComplete: 100 },
      entryTransaction: { id: 'tx-1' } as any,
    };

    mockUseFetcher.mockReturnValue({
      data: mockData,
      status: useFetcherModule.FETCH_STATUS.SUCCESS,
      error: undefined,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useUnifiedWaterfallFetcher({
        start: '2025-01-15T00:00:00.000Z',
        end: '2025-01-15T01:00:00.000Z',
        traceId: 'trace-123',
        entryTransactionId: 'tx-1',
      })
    );

    expect(result.current.traceItems).toEqual(mockData.traceItems);
    expect(result.current.errors).toEqual(mockData.errors);
    expect(result.current.agentMarks).toEqual(mockData.agentMarks);
    expect(result.current.entryTransaction).toEqual(mockData.entryTransaction);
    expect(result.current.status).toBe(useFetcherModule.FETCH_STATUS.SUCCESS);
  });

  it('does not call API when traceId is undefined', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: useFetcherModule.FETCH_STATUS.NOT_INITIATED,
      error: undefined,
      refetch: jest.fn(),
    });

    renderHook(() =>
      useUnifiedWaterfallFetcher({
        start: '2025-01-15T00:00:00.000Z',
        end: '2025-01-15T01:00:00.000Z',
        traceId: undefined,
      })
    );

    expect(mockUseFetcher).toHaveBeenCalled();

    const fetcherFn = mockUseFetcher.mock.calls[0][0];
    const mockCallApmApi = jest.fn();

    const result = fetcherFn(mockCallApmApi, {} as AbortSignal);

    expect(result).toBeUndefined();
    expect(mockCallApmApi).not.toHaveBeenCalled();
  });

  it('does not call API when useUnified is false (default)', () => {
    // useUnified = false means legacy is used, so unified fetcher should skip API call
    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn().mockReturnValue(false),
        },
      },
    } as any);

    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: useFetcherModule.FETCH_STATUS.NOT_INITIATED,
      error: undefined,
      refetch: jest.fn(),
    });

    renderHook(() =>
      useUnifiedWaterfallFetcher({
        start: '2025-01-15T00:00:00.000Z',
        end: '2025-01-15T01:00:00.000Z',
        traceId: 'trace-123',
        entryTransactionId: 'tx-1',
      })
    );

    const fetcherFn = mockUseFetcher.mock.calls[0][0];
    const mockCallApmApi = jest.fn();

    const result = fetcherFn(mockCallApmApi, {} as AbortSignal);

    expect(result).toBeUndefined();
    expect(mockCallApmApi).not.toHaveBeenCalled();
  });

  it('calls API with correct parameters when all params are provided', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: useFetcherModule.FETCH_STATUS.LOADING,
      error: undefined,
      refetch: jest.fn(),
    });

    renderHook(() =>
      useUnifiedWaterfallFetcher({
        start: '2025-01-15T00:00:00.000Z',
        end: '2025-01-15T01:00:00.000Z',
        traceId: 'trace-123',
        entryTransactionId: 'tx-1',
        serviceName: 'test-service',
      })
    );

    const fetcherFn = mockUseFetcher.mock.calls[0][0];
    const mockCallApmApi = jest.fn().mockResolvedValue({});

    fetcherFn(mockCallApmApi, {} as AbortSignal);

    expect(mockCallApmApi).toHaveBeenCalledWith('GET /internal/apm/unified_traces/{traceId}', {
      params: {
        path: { traceId: 'trace-123' },
        query: {
          start: '2025-01-15T00:00:00.000Z',
          end: '2025-01-15T01:00:00.000Z',
          entryTransactionId: 'tx-1',
          serviceName: 'test-service',
        },
      },
    });
  });

  it('includes correct dependencies in useFetcher', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: useFetcherModule.FETCH_STATUS.NOT_INITIATED,
      error: undefined,
      refetch: jest.fn(),
    });

    renderHook(() =>
      useUnifiedWaterfallFetcher({
        start: '2025-01-15T00:00:00.000Z',
        end: '2025-01-15T01:00:00.000Z',
        traceId: 'trace-123',
        entryTransactionId: 'tx-1',
        serviceName: 'test-service',
      })
    );

    const dependencies = mockUseFetcher.mock.calls[0][1];
    expect(dependencies).toEqual([
      'trace-123',
      '2025-01-15T00:00:00.000Z',
      '2025-01-15T01:00:00.000Z',
      'tx-1',
      'test-service',
      true,
    ]);
  });
});
