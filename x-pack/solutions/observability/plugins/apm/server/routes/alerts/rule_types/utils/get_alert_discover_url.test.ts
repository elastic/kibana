/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  ERROR_GROUP_ID,
} from '../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import { getAlertDiscoverUrl } from './get_alert_discover_url';

describe('getAlertDiscoverUrl', () => {
  const mockGetRedirectUrl = jest.fn();
  const mockDiscoverLocator = {
    getRedirectUrl: mockGetRedirectUrl,
  } as unknown as LocatorPublic<DiscoverAppLocatorParams>;

  const baseParams = {
    discoverLocator: mockDiscoverLocator,
    index: 'apm-*-transaction',
    groupByFields: {},
    dateStart: '2024-01-01T00:00:00Z',
    dateEnd: '2024-01-01T01:00:00Z',
    spaceId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedirectUrl.mockReturnValue('http://localhost:5601/discover-url');
  });

  it('returns undefined when discoverLocator is not provided', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      discoverLocator: undefined,
    });

    expect(result).toBeUndefined();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it('generates URL with no filters when groupByFields is empty', () => {
    const result = getAlertDiscoverUrl(baseParams);

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0]).toMatchObject({
      timeRange: {
        from: baseParams.dateStart,
        to: baseParams.dateEnd,
      },
      useHash: true,
    });
    expect(callArgs[0].query.esql).toContain('apm-*-transaction');
    expect(callArgs[1]).toEqual({ spaceId: 'default' });
  });

  it('generates URL with service name filter', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [SERVICE_NAME]: 'my-service',
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).toContain('service.name');
    expect(callArgs[0].query.esql).toContain('my-service');
  });

  it('generates URL with environment filter', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [SERVICE_ENVIRONMENT]: 'production',
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).toContain('service.environment');
    expect(callArgs[0].query.esql).toContain('production');
  });

  it('excludes environment filter when value is ENVIRONMENT_ALL_VALUE', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [SERVICE_ENVIRONMENT]: ENVIRONMENT_ALL_VALUE,
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).not.toContain('service.environment');
  });

  it('excludes environment filter when value is ENVIRONMENT_NOT_DEFINED_VALUE', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [SERVICE_ENVIRONMENT]: ENVIRONMENT_NOT_DEFINED_VALUE,
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).not.toContain('service.environment');
  });

  it('generates URL with transaction type filter', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [TRANSACTION_TYPE]: 'request',
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).toContain('transaction.type');
    expect(callArgs[0].query.esql).toContain('request');
  });

  it('generates URL with transaction name filter', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [TRANSACTION_NAME]: 'GET /api/users',
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).toContain('transaction.name');
    expect(callArgs[0].query.esql).toContain('GET /api/users');
  });

  it('generates URL with error group id filter', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [ERROR_GROUP_ID]: 'error-123',
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].query.esql).toContain('error.grouping_key');
    expect(callArgs[0].query.esql).toContain('error-123');
  });

  it('generates URL with multiple filters', () => {
    const result = getAlertDiscoverUrl({
      ...baseParams,
      groupByFields: {
        [SERVICE_NAME]: 'my-service',
        [SERVICE_ENVIRONMENT]: 'production',
        [TRANSACTION_TYPE]: 'request',
        [TRANSACTION_NAME]: 'GET /api/users',
      },
    });

    expect(result).toBe('http://localhost:5601/discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    const esql = callArgs[0].query.esql;
    expect(esql).toContain('service.name');
    expect(esql).toContain('my-service');
    expect(esql).toContain('service.environment');
    expect(esql).toContain('production');
    expect(esql).toContain('transaction.type');
    expect(esql).toContain('request');
    expect(esql).toContain('transaction.name');
    expect(esql).toContain('GET /api/users');
  });

  it('passes spaceId to getRedirectUrl', () => {
    getAlertDiscoverUrl({
      ...baseParams,
      spaceId: 'custom-space',
    });

    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[1]).toEqual({ spaceId: 'custom-space' });
  });

  it('handles undefined spaceId', () => {
    getAlertDiscoverUrl({
      ...baseParams,
      spaceId: undefined,
    });

    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[1]).toEqual({ spaceId: undefined });
  });

  it('always uses useHash: true', () => {
    getAlertDiscoverUrl(baseParams);

    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].useHash).toBe(true);
  });

  it('passes correct timeRange to discover locator', () => {
    const dateStart = '2024-01-01T10:00:00Z';
    const dateEnd = '2024-01-01T11:00:00Z';

    getAlertDiscoverUrl({
      ...baseParams,
      dateStart,
      dateEnd,
    });

    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const callArgs = mockGetRedirectUrl.mock.calls[0];
    expect(callArgs[0].timeRange).toEqual({
      from: dateStart,
      to: dateEnd,
    });
  });
});
