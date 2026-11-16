/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { useTransactionDetailFlyoutLinks } from './use_transaction_detail_flyout_links';

const mockUseApmIndices = jest.fn();
const mockUseResolvedApmIndices = jest.fn();
jest.mock('../../../../hooks/use_apm_indices', () => ({
  useApmIndices: (...args: unknown[]) => mockUseApmIndices(...args),
  useResolvedApmIndices: (...args: unknown[]) => mockUseResolvedApmIndices(...args),
}));

const mockGetFlyoutDiscoverNavigation = jest.fn((_args: unknown) => ({
  href: 'https://discover',
  esqlQuery: 'FROM traces',
}));
jest.mock('../../service_flyout/utils/get_flyout_discover_navigation', () => ({
  getFlyoutDiscoverNavigation: (args: unknown) => mockGetFlyoutDiscoverNavigation(args),
}));

const mockUseTransactionDetailFlyoutContext = jest.fn();
jest.mock('../transaction_detail_flyout_context', () => ({
  useTransactionDetailFlyoutContext: () => mockUseTransactionDetailFlyoutContext(),
}));

const INDICES = { transaction: 'traces-apm*' } as APMIndices;

const FILTERS = {
  serviceName: 'checkout',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  environment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  start: '2026-08-20T10:00:00.000Z',
  end: '2026-08-20T10:15:00.000Z',
};

function mockContext(indices: APMIndices | null | undefined) {
  mockUseTransactionDetailFlyoutContext.mockReturnValue({
    deps: { share: undefined },
    contextActions: undefined,
    indices,
    filters: FILTERS,
  });
}

describe('useTransactionDetailFlyoutLinks', () => {
  beforeEach(() => {
    mockGetFlyoutDiscoverNavigation.mockClear();
    mockUseApmIndices.mockClear();
    mockUseResolvedApmIndices.mockClear();
  });

  it('builds Discover navigation from context indices and does not fetch', () => {
    mockContext(INDICES);

    const { result } = renderHook(() => useTransactionDetailFlyoutLinks());

    expect(result.current.loading).toBe(false);
    expect(result.current.discover.href).toBe('https://discover');
    expect(mockGetFlyoutDiscoverNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        indices: INDICES,
        indexType: 'traces',
        rangeFrom: FILTERS.rangeFrom,
        rangeTo: FILTERS.rangeTo,
        queryParams: expect.objectContaining({
          serviceName: FILTERS.serviceName,
          transactionName: FILTERS.transactionName,
        }),
      })
    );
    expect(mockUseApmIndices).not.toHaveBeenCalled();
    expect(mockUseResolvedApmIndices).not.toHaveBeenCalled();
  });

  it('reports loading while context indices are still unresolved', () => {
    mockContext(undefined);

    const { result } = renderHook(() => useTransactionDetailFlyoutLinks());

    expect(result.current.loading).toBe(true);
    expect(mockGetFlyoutDiscoverNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ indices: undefined })
    );
    expect(mockUseApmIndices).not.toHaveBeenCalled();
  });

  it('stops loading when context indices failed', () => {
    mockContext(null);

    const { result } = renderHook(() => useTransactionDetailFlyoutLinks());

    expect(result.current.loading).toBe(false);
    expect(mockGetFlyoutDiscoverNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ indices: null })
    );
  });
});
