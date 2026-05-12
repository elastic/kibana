/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetServiceBadgeHrefFromRouter } from './use_get_service_badge_href_from_router';
import * as useApmRouterModule from '../../../hooks/use_apm_router';
import * as useApmParamsModule from '../../../hooks/use_apm_params';

describe('useGetServiceBadgeHrefFromRouter', () => {
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
      (path: string, { path: { serviceName } }: any) => `/apm/services/${serviceName}/overview`
    );

    mockUseApmRouter.mockReturnValue({ link: mockLink } as any);
    mockUseAnyOfApmParams.mockReturnValue({ query: defaultQuery } as any);
  });

  it('returns a function', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromRouter());

    expect(typeof result.current).toBe('function');
  });

  it('calls router.link with the correct service overview route and service name', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromRouter());

    result.current('my-service');

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/overview', {
      path: { serviceName: 'my-service' },
      query: { ...defaultQuery, kuery: '', serviceGroup: '' },
    });
  });

  it('preserves rangeFrom, rangeTo, environment and comparisonEnabled from the current route', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromRouter());

    result.current('my-service');

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

  it('resets kuery and serviceGroup regardless of current values', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromRouter());

    result.current('my-service');

    expect(mockLink).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({ kuery: '', serviceGroup: '' }),
      })
    );
  });

  it('returns the href produced by router.link', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromRouter());

    const href = result.current('checkout-service');

    expect(href).toBe('/apm/services/checkout-service/overview');
  });

  it('works when called from the /dependencies/operation route', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        environment: 'staging',
        comparisonEnabled: false,
        kuery: '',
        serviceGroup: '',
      },
    } as any);

    const { result } = renderHook(() => useGetServiceBadgeHrefFromRouter());

    result.current('downstream-service');

    expect(mockLink).toHaveBeenCalledWith('/services/{serviceName}/overview', {
      path: { serviceName: 'downstream-service' },
      query: expect.objectContaining({
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        environment: 'staging',
        kuery: '',
        serviceGroup: '',
      }),
    });
  });
});
