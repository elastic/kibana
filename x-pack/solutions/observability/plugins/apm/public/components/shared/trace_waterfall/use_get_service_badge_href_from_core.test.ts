/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetServiceBadgeHrefFromCore } from './use_get_service_badge_href_from_core';
import type { CoreStart } from '@kbn/core/public';

describe('useGetServiceBadgeHrefFromCore', () => {
  const mockGetUrlForApp = jest.fn();

  const mockCore = {
    application: { getUrlForApp: mockGetUrlForApp },
  } as unknown as CoreStart;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockImplementation(
      (_app: string, { path }: { path: string }) => `/app/apm${path}`
    );
  });

  it('returns a function', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromCore(mockCore, 'now-15m', 'now'));

    expect(typeof result.current).toBe('function');
  });

  it('calls getUrlForApp with the apm app and service overview path', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromCore(mockCore, 'now-15m', 'now'));

    result.current('my-service');

    expect(mockGetUrlForApp).toHaveBeenCalledWith(
      'apm',
      expect.objectContaining({
        path: expect.stringContaining('/services/my-service/overview'),
      })
    );
  });

  it('includes rangeFrom and rangeTo in the query string', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromCore(mockCore, 'now-30m', 'now'));

    result.current('my-service');

    expect(mockGetUrlForApp).toHaveBeenCalledWith(
      'apm',
      expect.objectContaining({
        path: expect.stringContaining('rangeFrom=now-30m'),
      })
    );
    expect(mockGetUrlForApp).toHaveBeenCalledWith(
      'apm',
      expect.objectContaining({
        path: expect.stringContaining('rangeTo=now'),
      })
    );
  });

  it('URL-encodes the service name in the path', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromCore(mockCore, 'now-15m', 'now'));

    result.current('my service/with special chars');

    expect(mockGetUrlForApp).toHaveBeenCalledWith(
      'apm',
      expect.objectContaining({
        path: expect.stringContaining(
          `/services/${encodeURIComponent('my service/with special chars')}/overview`
        ),
      })
    );
  });

  it('returns the href produced by getUrlForApp', () => {
    const { result } = renderHook(() => useGetServiceBadgeHrefFromCore(mockCore, 'now-15m', 'now'));

    const href = result.current('checkout-service');

    expect(href).toMatch(/^\/app\/apm\/services\/checkout-service\/overview/);
  });
});
