/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../__mocks__/http_agent.mock';

jest.mock('node-fetch');
import fetch from 'node-fetch';

import { KibanaRequest } from '@kbn/core/server';

import { ConfigType } from '..';

import { fetchEnterpriseSearch, isResponseError } from './fetch_enterprise_search';

describe('fetchEnterpriseSearch', () => {
  const mockConfig = {
    accessCheckTimeout: 200,
    accessCheckTimeoutWarning: 100,
    host: 'http://localhost:3002',
  };
  const mockRequest = {
    headers: { authorization: '==someAuth' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns json fetch response', async () => {
    const response = { foo: 'bar' };
    (fetch as unknown as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce(response),
      ok: true,
    });
    await expect(
      fetchEnterpriseSearch(mockConfig as ConfigType, mockRequest as KibanaRequest, '/api/v1/test')
    ).resolves.toBe(response);
  });
  it('calls expected endpoint', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({}),
      ok: true,
    });
    await fetchEnterpriseSearch(
      mockConfig as ConfigType,
      mockRequest as KibanaRequest,
      '/api/v1/test'
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3002/api/v1/test', expect.anything());
  });
  it('uses request auth header & config custom headers', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({}),
      ok: true,
    });
    const config = {
      ...mockConfig,
      customHeaders: {
        foo: 'bar',
      },
    };
    await fetchEnterpriseSearch(
      config as unknown as ConfigType,
      mockRequest as KibanaRequest,
      '/api/v1/test'
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.anything(), {
      agent: expect.anything(),
      headers: {
        Authorization: mockRequest.headers.authorization,
        foo: 'bar',
      },
    });
  });
  it('returns undefined when config.host is unavailable', async () => {
    await expect(
      fetchEnterpriseSearch(
        { host: '' } as ConfigType,
        mockRequest as KibanaRequest,
        '/api/v1/test'
      )
    ).resolves.toBeUndefined();
  });
});

describe('isResponseError', () => {
  it('returns true for ResponseError object', () => {
    expect(isResponseError({ responseStatus: 404, responseStatusText: 'NOT_FOUND' })).toBe(true);
  });
  it('returns false for null/undefined', () => {
    expect(isResponseError(null)).toBe(false);
    expect(isResponseError(undefined)).toBe(false);
  });
  it('returns false for object without expected keys', () => {
    expect(isResponseError({})).toBe(false);
    expect(isResponseError({ responseStatusText: 'NOT_FOUND' })).toBe(false);
    expect(isResponseError({ responseStatus: 404 })).toBe(false);
    expect(isResponseError([])).toBe(false);
  });
  it('returns false for non-object', () => {
    expect(isResponseError(100)).toBe(false);
    expect(isResponseError('test')).toBe(false);
  });
});
