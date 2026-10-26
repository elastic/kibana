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

const mockCallApmApi = jest.fn();
jest.mock('../../../../plugin', () => ({
  getApmInternalServices: () => ({ callApmApi: mockCallApmApi }),
}));

const baseParams = {
  serviceName: 'opbeans-java',
  environment: 'production' as const,
  start: '2024-01-01T00:00:00.000Z',
  end: '2024-01-01T01:00:00.000Z',
};

describe('useServiceFlyoutCapabilities', () => {
  beforeEach(() => {
    mockUseAbortableAsync.mockClear();
    mockCallApmApi.mockClear();
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

    it('falls back to full capabilities when the fetch fails', () => {
      mockUseAbortableAsync.mockReturnValue({
        value: undefined,
        loading: false,
        error: new Error('network failure'),
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

      expect(mockCallApmApi).toHaveBeenCalledWith(
        'GET /internal/apm/services/{serviceName}/ingestion_type',
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

    it('passes the service name as a path param without manual encoding', () => {
      mockUseAbortableAsync.mockReturnValue({ value: undefined, loading: true, error: undefined });

      renderHook(() =>
        useServiceFlyoutCapabilities({ ...baseParams, serviceName: 'my service/v2' })
      );

      const [fetcherFn] = mockUseAbortableAsync.mock.calls[0];
      fetcherFn({ signal: new AbortController().signal });

      expect(mockCallApmApi).toHaveBeenCalledWith(
        'GET /internal/apm/services/{serviceName}/ingestion_type',
        expect.objectContaining({
          params: expect.objectContaining({ path: { serviceName: 'my service/v2' } }),
        })
      );
    });
  });
});
