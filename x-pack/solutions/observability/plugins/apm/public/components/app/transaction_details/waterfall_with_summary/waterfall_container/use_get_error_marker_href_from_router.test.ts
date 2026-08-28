/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetErrorMarkerHrefFromRouter } from './use_get_error_marker_href_from_router';
import * as useApmRouterModule from '../../../../../hooks/use_apm_router';
import * as useApmParamsModule from '../../../../../hooks/use_apm_params';

describe('useGetErrorMarkerHrefFromRouter', () => {
  const mockLink = jest.fn();

  const mockUseApmRouter = jest.spyOn(useApmRouterModule, 'useApmRouter');
  const mockUseAnyOfApmParams = jest.spyOn(useApmParamsModule, 'useAnyOfApmParams');

  const defaultQuery = {
    rangeFrom: 'now-15m',
    rangeTo: 'now',
    environment: 'production',
    comparisonEnabled: true,
    transactionName: 'GET /api/orders',
    serviceGroup: 'my-group',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLink.mockImplementation(
      (path: string, { path: { serviceName, groupId } }: any) =>
        `/apm/services/${serviceName}/errors/${groupId}`
    );

    mockUseApmRouter.mockReturnValue({ link: mockLink } as any);
    mockUseAnyOfApmParams.mockReturnValue({ query: defaultQuery } as any);
  });

  it('returns a function', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    expect(typeof result.current).toBe('function');
  });

  it('calls router.link with the correct error group route, service name and errorGroupId', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({ serviceName: 'my-service', errorGroupId: 'abc123' });

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/errors/{groupId}', {
      path: { serviceName: 'my-service', groupId: 'abc123' },
      query: expect.objectContaining({
        ...defaultQuery,
        serviceGroup: 'my-group',
        kuery: '',
      }),
    });
  });

  it('builds kuery with traceId when provided', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({
      serviceName: 'my-service',
      errorGroupId: 'abc123',
      traceId: 'trace-456',
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'trace.id : "trace-456"',
        }),
      })
    );
  });

  it('builds kuery with transactionId when provided', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({
      serviceName: 'my-service',
      errorGroupId: 'abc123',
      transactionId: 'tx-789',
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'transaction.id : "tx-789"',
        }),
      })
    );
  });

  it('builds kuery combining traceId and transactionId when both provided', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({
      serviceName: 'my-service',
      errorGroupId: 'abc123',
      traceId: 'trace-456',
      transactionId: 'tx-789',
    });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          kuery: 'trace.id : "trace-456" and transaction.id : "tx-789"',
        }),
      })
    );
  });

  it('sets empty kuery when neither traceId nor transactionId are provided', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({ serviceName: 'my-service', errorGroupId: 'abc123' });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({ kuery: '' }),
      })
    );
  });

  it('preserves serviceGroup from current query', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({ serviceName: 'my-service', errorGroupId: 'abc123' });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({ serviceGroup: 'my-group' }),
      })
    );
  });

  it('preserves rangeFrom, rangeTo, environment and comparisonEnabled from the current route', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({ serviceName: 'my-service', errorGroupId: 'abc123' });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          environment: 'production',
          comparisonEnabled: true,
        }),
      })
    );
  });

  it('returns the href produced by router.link', () => {
    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    const href = result.current({ serviceName: 'checkout-service', errorGroupId: 'err-group-1' });

    expect(href).toBe('/apm/services/checkout-service/errors/err-group-1');
  });

  it('defaults serviceGroup to empty string when not present in query', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        environment: 'staging',
        comparisonEnabled: false,
        kuery: '',
      },
    } as any);

    const { result } = renderHook(() => useGetErrorMarkerHrefFromRouter());

    result.current({ serviceName: 'my-service', errorGroupId: 'abc123' });

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({ serviceGroup: '' }),
      })
    );
  });
});
