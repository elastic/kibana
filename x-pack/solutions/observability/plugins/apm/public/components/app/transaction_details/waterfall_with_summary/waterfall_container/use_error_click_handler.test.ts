/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useErrorClickHandler } from './use_error_click_handler';
import * as useApmRouterModule from '../../../../../hooks/use_apm_router';
import * as useApmParamsModule from '../../../../../hooks/use_apm_params';
import * as useApmPluginContextModule from '../../../../../context/apm_plugin/use_apm_plugin_context';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';

describe('useErrorClickHandler', () => {
  const mockNavigateToUrl = jest.fn();
  const mockLink = jest.fn();
  const mockOnOpenDocFlyout = jest.fn();

  const mockUseApmRouter = jest.spyOn(useApmRouterModule, 'useApmRouter');
  const mockUseAnyOfApmParams = jest.spyOn(useApmParamsModule, 'useAnyOfApmParams');
  const mockUseApmPluginContext = jest.spyOn(
    useApmPluginContextModule,
    'useApmPluginContext'
  ) as jest.SpyInstance;

  const defaultQuery = {
    rangeFrom: 'now-15m',
    rangeTo: 'now',
    environment: 'ENVIRONMENT_ALL',
    kuery: '',
  };

  const mockTraceItems: TraceItem[] = [
    {
      id: 'span-1',
      name: 'Test Span',
      timestampUs: 1000000,
      traceId: 'trace-123',
      duration: 500000,
      errors: [],
      serviceName: 'test-service',
      spanLinksCount: { incoming: 0, outgoing: 0 },
      docType: 'span',
    },
    {
      id: 'tx-1',
      name: 'Test Transaction',
      timestampUs: 1000000,
      traceId: 'trace-123',
      duration: 1000000,
      errors: [],
      serviceName: 'mobile-service',
      agentName: 'iOS/swift',
      spanLinksCount: { incoming: 0, outgoing: 0 },
      docType: 'transaction',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockLink.mockImplementation((path: string) => `/apm${path}`);
    mockOnOpenDocFlyout.mockReset();

    mockUseApmRouter.mockReturnValue({
      link: mockLink,
    } as any);

    mockUseAnyOfApmParams.mockReturnValue({
      query: defaultQuery,
    } as any);

    mockUseApmPluginContext.mockReturnValue({
      core: {
        application: {
          navigateToUrl: mockNavigateToUrl,
        },
      },
    } as any);
  });

  it('returns a callback function', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    expect(typeof result.current).toBe('function');
  });

  it('does not navigate when item is not found', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-123',
      docId: 'non-existent-id',
      errorCount: 1,
    });

    expect(mockNavigateToUrl).not.toHaveBeenCalled();
    expect(mockOnOpenDocFlyout).not.toHaveBeenCalled();
  });

  it('navigates to standard errors page for a single classic APM error', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-123',
      docId: 'span-1',
      errorCount: 1,
      errorSource: 'apm',
    });

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/errors', {
      path: { serviceName: 'test-service' },
      query: {
        ...defaultQuery,
        serviceGroup: '',
        kuery: 'trace.id : "trace-123" and (span.id : "span-1" or transaction.id : "span-1")',
        // traceId/spanId are appended so the OTel panel can self-suppress when absent.
        traceId: 'trace-123',
        spanId: 'span-1',
      },
    });
    expect(mockNavigateToUrl).toHaveBeenCalled();
    expect(mockOnOpenDocFlyout).not.toHaveBeenCalled();
  });

  it('navigates to mobile errors page for a single classic APM error on a mobile agent', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-123',
      docId: 'tx-1',
      errorCount: 1,
      errorSource: 'apm',
    });

    expect(mockLink).toHaveBeenCalledWith('/mobile-services/{serviceName}/errors-and-crashes', {
      path: { serviceName: 'mobile-service' },
      query: {
        ...defaultQuery,
        serviceGroup: '',
        kuery: 'trace.id : "trace-123" and (span.id : "tx-1" or transaction.id : "tx-1")',
      },
    });
    expect(mockNavigateToUrl).toHaveBeenCalled();
    expect(mockOnOpenDocFlyout).not.toHaveBeenCalled();
  });

  it('navigates to errors page for multiple classic APM errors (regression guard for synth-classic-errors)', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'my-trace-id',
      docId: 'span-1',
      errorCount: 2,
      errorSource: 'apm',
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'trace.id : "my-trace-id" and (span.id : "span-1" or transaction.id : "span-1")',
          traceId: 'my-trace-id',
          spanId: 'span-1',
        }),
      })
    );
    expect(mockNavigateToUrl).toHaveBeenCalled();
    expect(mockOnOpenDocFlyout).not.toHaveBeenCalled();
  });

  it('opens log flyout for a single unprocessed OTel error', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-123',
      docId: 'span-1',
      errorCount: 1,
      errorDocId: 'log-doc-id',
      docIndex: 'logs-generic.otel-default',
      errorSource: 'unprocessedOtel',
    });

    expect(mockOnOpenDocFlyout).toHaveBeenCalledWith({
      type: 'log',
      docId: 'log-doc-id',
      docIndex: 'logs-generic.otel-default',
      activeSection: undefined,
    });
    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });

  it('opens span flyout with errors-table for pure-OTel multi-error rows (unprocessedOtel source)', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-123',
      docId: 'span-1',
      errorCount: 3,
      errorSource: 'unprocessedOtel',
    });

    expect(mockOnOpenDocFlyout).toHaveBeenCalledWith({
      type: 'span',
      docId: 'span-1',
      docIndex: undefined,
      activeSection: 'errors-table',
    });
    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });

  it('navigates to errors page with traceId/spanId for mixed spans (APM + OTel errors)', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-mixed',
      docId: 'span-1',
      errorCount: 3,
      errorSource: 'mixed',
    });

    expect(mockLink).toHaveBeenCalledWith(
      '/services/{serviceName}/errors',
      expect.objectContaining({
        query: expect.objectContaining({
          traceId: 'trace-mixed',
          spanId: 'span-1',
        }),
      })
    );
    expect(mockNavigateToUrl).toHaveBeenCalled();
    expect(mockOnOpenDocFlyout).not.toHaveBeenCalled();
  });

  it('explicit traceId overrides any stale traceId inherited from the transactions/view route query', () => {
    // transactions/view declares traceId in its own schema; use_error_click_handler spreads
    // the whole query object, which may carry a stale traceId from the sampled transaction.
    // The row's own errorTraceId must win.
    mockUseAnyOfApmParams.mockReturnValue({
      query: { ...defaultQuery, traceId: 'stale-trace-from-transactions-view' },
    } as any);

    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'actual-error-trace',
      docId: 'span-1',
      errorCount: 1,
      errorSource: 'apm',
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          // The row's traceId overrides the stale one from the spread.
          traceId: 'actual-error-trace',
          spanId: 'span-1',
        }),
      })
    );
    // Stale traceId must NOT appear in the link when it differs.
    const callArgs = mockLink.mock.calls[0][1] as { query: Record<string, unknown> };
    expect(callArgs.query.traceId).toBe('actual-error-trace');
  });

  it('constructs correct kuery with traceId and both id fields for spans (multiple APM errors)', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems, mockOnOpenDocFlyout));

    // Use span-1 (non-mobile service) so the result is the standard /errors route with all params.
    result.current({
      traceId: 'my-trace-id',
      docId: 'span-1',
      errorCount: 2,
      errorSource: 'apm',
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'trace.id : "my-trace-id" and (span.id : "span-1" or transaction.id : "span-1")',
          traceId: 'my-trace-id',
          spanId: 'span-1',
        }),
      })
    );
  });

  // OTel-native transactions are identified by `span.id` only: the waterfall item id is the
  // OTel span id and the error documents have no `transaction.id` at all.
  it('matches span.id for an OTel-native transaction whose id is a span id', () => {
    const otelTraceItems: TraceItem[] = [
      {
        id: 'otel-span-id',
        name: 'oteldemo.AdServiceSynth/GetAds',
        timestampUs: 1000000,
        traceId: 'trace-123',
        duration: 1000000,
        errors: [{ errorDocId: 'error-1', source: 'apm' }],
        serviceName: 'otel-service',
        agentName: 'otlp/nodejs',
        spanLinksCount: { incoming: 0, outgoing: 0 },
        docType: 'transaction',
      },
    ];

    const { result } = renderHook(() => useErrorClickHandler(otelTraceItems, mockOnOpenDocFlyout));

    result.current({
      traceId: 'trace-123',
      docId: 'otel-span-id',
      errorCount: 1,
      errorSource: 'apm',
    });

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/errors', {
      path: { serviceName: 'otel-service' },
      query: {
        ...defaultQuery,
        serviceGroup: '',
        kuery:
          'trace.id : "trace-123" and (span.id : "otel-span-id" or transaction.id : "otel-span-id")',
        traceId: 'trace-123',
        spanId: 'otel-span-id',
      },
    });
  });
});
