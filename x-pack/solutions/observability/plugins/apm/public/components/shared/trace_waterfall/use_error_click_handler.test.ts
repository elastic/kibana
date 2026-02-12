/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useErrorClickHandler } from './use_error_click_handler';
import * as useApmRouterModule from '../../../hooks/use_apm_router';
import * as useApmParamsModule from '../../../hooks/use_apm_params';
import * as useApmPluginContextModule from '../../../context/apm_plugin/use_apm_plugin_context';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

describe('useErrorClickHandler', () => {
  const mockNavigateToUrl = jest.fn();
  const mockLink = jest.fn();

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
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems));

    expect(typeof result.current).toBe('function');
  });

  it('does not navigate when item is not found', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems));

    result.current({
      traceId: 'trace-123',
      docId: 'non-existent-id',
      errorCount: 1,
    });

    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });

  it('navigates to standard errors page for non-mobile agents', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems));

    result.current({
      traceId: 'trace-123',
      docId: 'span-1',
      errorCount: 1,
    });

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/errors', {
      path: { serviceName: 'test-service' },
      query: {
        ...defaultQuery,
        serviceGroup: '',
        kuery: 'trace.id : "trace-123" and span.id : "span-1"',
      },
    });
    expect(mockNavigateToUrl).toHaveBeenCalled();
  });

  it('navigates to mobile errors page for mobile agents', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems));

    result.current({
      traceId: 'trace-123',
      docId: 'tx-1',
      errorCount: 1,
    });

    expect(mockLink).toHaveBeenCalledWith('/mobile-services/{serviceName}/errors-and-crashes', {
      path: { serviceName: 'mobile-service' },
      query: {
        ...defaultQuery,
        serviceGroup: '',
        kuery: 'trace.id : "trace-123" and transaction.id : "tx-1"',
      },
    });
    expect(mockNavigateToUrl).toHaveBeenCalled();
  });

  it('constructs correct kuery with traceId and span.id for spans', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems));

    result.current({
      traceId: 'my-trace-id',
      docId: 'span-1',
      errorCount: 2,
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'trace.id : "my-trace-id" and span.id : "span-1"',
        }),
      })
    );
  });

  it('constructs correct kuery with traceId and transaction.id for transactions', () => {
    const { result } = renderHook(() => useErrorClickHandler(mockTraceItems));

    result.current({
      traceId: 'my-trace-id',
      docId: 'tx-1',
      errorCount: 2,
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'trace.id : "my-trace-id" and transaction.id : "tx-1"',
        }),
      })
    );
  });
});
