/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceFlyoutCapabilities } from './use_service_flyout_capabilities';

const mockUseAbortableAsync = jest.fn();

jest.mock('@kbn/react-hooks', () => ({
  useAbortableAsync: (...args: unknown[]) => mockUseAbortableAsync(...args),
}));

const mockHttp = { fetch: jest.fn() };

const baseParams = {
  http: mockHttp as any,
  serviceName: 'opbeans-java',
  environment: 'production' as const,
  start: '2024-01-01T00:00:00.000Z',
  end: '2024-01-01T01:00:00.000Z',
};

describe('useServiceFlyoutCapabilities', () => {
  beforeEach(() => {
    mockUseAbortableAsync.mockClear();
    mockHttp.fetch.mockClear();
  });

  describe('loading and error states', () => {
    it('returns loading state with undefined capability fields while the fetch is in progress', () => {
      mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true, error: undefined });

      const { result } = renderHook(() => useServiceFlyoutCapabilities(baseParams));

      expect(result.current).toEqual({
        loading: true,
        error: undefined,
        schema: undefined,
        header: undefined,
        overview: undefined,
        footer: undefined,
      });
    });

    it('returns error state with undefined capability fields when the fetch fails', () => {
      const error = new Error('network failure');
      mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: false, error });

      const { result } = renderHook(() => useServiceFlyoutCapabilities(baseParams));

      expect(result.current).toEqual({
        loading: false,
        error,
        schema: undefined,
        header: undefined,
        overview: undefined,
        footer: undefined,
      });
    });
  });

  describe('capability mapping per schema', () => {
    it('returns full capabilities for ecs schema', () => {
      mockUseAbortableAsync.mockReturnValue({
        value: { schema: 'ecs' },
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useServiceFlyoutCapabilities(baseParams));

      expect(result.current).toEqual({
        loading: false,
        error: undefined,
        schema: 'ecs',
        header: { serviceNameLink: true, badges: true },
        overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
        footer: { alerts: true, slos: true },
      });
    });

    it('returns restricted capabilities for otel schema', () => {
      mockUseAbortableAsync.mockReturnValue({
        value: { schema: 'otel' },
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useServiceFlyoutCapabilities(baseParams));

      expect(result.current).toEqual({
        loading: false,
        error: undefined,
        schema: 'otel',
        header: { serviceNameLink: false, badges: false },
        overview: { transactions: false, transactionTypeFilter: false, infraMetrics: false },
        footer: { alerts: false, slos: false },
      });
    });

    it('returns full capabilities for unknown schema', () => {
      mockUseAbortableAsync.mockReturnValue({
        value: { schema: 'unknown' },
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useServiceFlyoutCapabilities(baseParams));

      expect(result.current).toEqual({
        loading: false,
        error: undefined,
        schema: 'unknown',
        header: { serviceNameLink: true, badges: true },
        overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
        footer: { alerts: true, slos: true },
      });
    });
  });

  describe('endpoint', () => {
    it('calls the correct endpoint with the right params', () => {
      mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true, error: undefined });

      renderHook(() => useServiceFlyoutCapabilities(baseParams));

      const [fetcherFn] = mockUseAbortableAsync.mock.calls[0];
      const signal = new AbortController().signal;
      fetcherFn({ signal });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/apm/services/opbeans-java/ingestion_type',
        {
          query: {
            environment: 'production',
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-01T01:00:00.000Z',
          },
          signal,
        }
      );
    });

    it('encodes special characters in the service name', () => {
      mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true, error: undefined });

      renderHook(() =>
        useServiceFlyoutCapabilities({ ...baseParams, serviceName: 'my service/v2' })
      );

      const [fetcherFn] = mockUseAbortableAsync.mock.calls[0];
      fetcherFn({ signal: new AbortController().signal });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/apm/services/my%20service%2Fv2/ingestion_type',
        expect.any(Object)
      );
    });
  });
});
