/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { getFlyoutDiscoverNavigation } from './get_flyout_discover_navigation';

const mockGetESQLQuery = jest.fn();
jest.mock('../../links/discover_links/get_esql_query', () => ({
  getESQLQuery: (...args: unknown[]) => mockGetESQLQuery(...args),
}));

const mockGetRedirectUrl = jest.fn(() => '/app/discover?mock-url');
const mockLocator = { getRedirectUrl: mockGetRedirectUrl };
const mockShare = {
  url: { locators: { get: jest.fn(() => mockLocator) } },
} as unknown as Parameters<typeof getFlyoutDiscoverNavigation>[0]['share'];

const mockIndices: APMIndices = {
  transaction: 'traces-apm*',
  span: 'traces-apm*',
  error: 'logs-apm.error-*',
  metric: 'metrics-apm*',
  onboarding: 'apm-*',
  sourcemap: 'apm-*',
};

const baseParams = {
  share: mockShare,
  indices: mockIndices,
  indexType: 'traces' as const,
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  queryParams: {
    serviceName: 'opbeans-java',
    environment: 'production',
    sortDirection: 'DESC' as const,
  },
};

describe('getFlyoutDiscoverNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLQuery.mockReturnValue('FROM traces-apm* | WHERE service.name == "opbeans-java"');
  });

  it('returns undefined href and null esqlQuery when indices is undefined', () => {
    const result = getFlyoutDiscoverNavigation({ ...baseParams, indices: undefined });
    expect(result).toEqual({ href: undefined, esqlQuery: null });
    expect(mockGetESQLQuery).not.toHaveBeenCalled();
  });

  it('returns undefined href and null esqlQuery when getESQLQuery returns null', () => {
    mockGetESQLQuery.mockReturnValue(null);
    const result = getFlyoutDiscoverNavigation(baseParams);
    expect(result).toEqual({ href: undefined, esqlQuery: null });
  });

  it('returns the Discover redirect URL and esqlQuery when all inputs are valid', () => {
    const result = getFlyoutDiscoverNavigation(baseParams);
    expect(result.href).toBe('/app/discover?mock-url');
    expect(result.esqlQuery).toBe('FROM traces-apm* | WHERE service.name == "opbeans-java"');
  });

  it('passes the time range to the locator', () => {
    getFlyoutDiscoverNavigation(baseParams);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: { from: 'now-15m', to: 'now' },
      })
    );
  });

  it('passes the ESQL query to the locator', () => {
    getFlyoutDiscoverNavigation(baseParams);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { esql: 'FROM traces-apm* | WHERE service.name == "opbeans-java"' },
      })
    );
  });

  it('calls getESQLQuery with indexSettings derived from indices for traces', () => {
    getFlyoutDiscoverNavigation({ ...baseParams, indexType: 'traces' });
    expect(mockGetESQLQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'traces',
        indexSettings: expect.arrayContaining([
          expect.objectContaining({
            configurationName: 'transaction',
            defaultValue: 'traces-apm*',
          }),
          expect.objectContaining({ configurationName: 'span', defaultValue: 'traces-apm*' }),
        ]),
      })
    );
  });

  it('calls getESQLQuery with indexSettings derived from indices for error', () => {
    getFlyoutDiscoverNavigation({ ...baseParams, indexType: 'error' });
    expect(mockGetESQLQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        indexType: 'error',
        indexSettings: expect.arrayContaining([
          expect.objectContaining({ configurationName: 'error', defaultValue: 'logs-apm.error-*' }),
        ]),
      })
    );
  });

  it('returns undefined href when share is undefined', () => {
    const result = getFlyoutDiscoverNavigation({ ...baseParams, share: undefined });
    expect(result.href).toBeUndefined();
    expect(result.esqlQuery).toBe('FROM traces-apm* | WHERE service.name == "opbeans-java"');
  });
});
