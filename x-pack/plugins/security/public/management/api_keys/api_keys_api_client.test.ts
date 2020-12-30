/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APIKeysAPIClient } from './api_keys_api_client';

import { httpServiceMock } from '../../../../../../src/core/public/mocks';

describe('APIKeysAPIClient', () => {
  it('checkPrivileges() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.get.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);

    await expect(apiClient.checkPrivileges()).resolves.toBe(mockResponse);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith('/internal/security/api_key/privileges');
  });

  it('getApiKeys() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.get.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);

    await expect(apiClient.getApiKeys()).resolves.toBe(mockResponse);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith('/internal/security/api_key', {
      query: { isAdmin: false },
    });
    httpMock.get.mockClear();

    await expect(apiClient.getApiKeys(false)).resolves.toBe(mockResponse);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith('/internal/security/api_key', {
      query: { isAdmin: false },
    });
    httpMock.get.mockClear();

    await expect(apiClient.getApiKeys(true)).resolves.toBe(mockResponse);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith('/internal/security/api_key', {
      query: { isAdmin: true },
    });
  });

  it('invalidateApiKeys() queries correct endpoint', async () => {
    const httpMock = httpServiceMock.createStartContract();

    const mockResponse = Symbol('mockResponse');
    httpMock.post.mockResolvedValue(mockResponse);

    const apiClient = new APIKeysAPIClient(httpMock);
    const mockAPIKeys = [
      { id: 'one', name: 'name-one' },
      { id: 'two', name: 'name-two' },
    ];

    await expect(apiClient.invalidateApiKeys(mockAPIKeys)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/invalidate', {
      body: JSON.stringify({ apiKeys: mockAPIKeys, isAdmin: false }),
    });
    httpMock.post.mockClear();

    await expect(apiClient.invalidateApiKeys(mockAPIKeys, false)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/invalidate', {
      body: JSON.stringify({ apiKeys: mockAPIKeys, isAdmin: false }),
    });
    httpMock.post.mockClear();

    await expect(apiClient.invalidateApiKeys(mockAPIKeys, true)).resolves.toBe(mockResponse);
    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith('/internal/security/api_key/invalidate', {
      body: JSON.stringify({ apiKeys: mockAPIKeys, isAdmin: true }),
    });
  });
});
