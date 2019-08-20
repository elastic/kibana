/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAPIKey, invalidateAPIKey } from './api_keys';
import { loggingServiceMock } from '../../../../../src/core/server/mocks';

const mockCallAsCurrentUser = jest.fn();

beforeEach(() => jest.resetAllMocks());

describe('createAPIKey()', () => {
  it('returns null when security feature is disabled', async () => {
    const result = await createAPIKey({
      body: {
        name: '',
        role_descriptors: {},
      },
      loggers: loggingServiceMock.create(),
      callAsCurrentUser: mockCallAsCurrentUser,
      isSecurityFeatureDisabled: () => true,
    });
    expect(result).toBeNull();
    expect(mockCallAsCurrentUser).not.toHaveBeenCalled();
  });

  it('calls callCluster with proper body arguments', async () => {
    mockCallAsCurrentUser.mockResolvedValueOnce({
      id: '123',
      name: 'key-name',
      expiration: '1d',
      api_key: 'abc123',
    });
    const result = await createAPIKey({
      body: {
        name: 'key-name',
        role_descriptors: { foo: true },
        expiration: '1d',
      },
      loggers: loggingServiceMock.create(),
      callAsCurrentUser: mockCallAsCurrentUser,
      isSecurityFeatureDisabled: () => false,
    });
    expect(result).toEqual({
      api_key: 'abc123',
      expiration: '1d',
      id: '123',
      name: 'key-name',
    });
    expect(mockCallAsCurrentUser).toHaveBeenCalledWith('shield.createAPIKey', {
      body: {
        name: 'key-name',
        role_descriptors: { foo: true },
        expiration: '1d',
      },
    });
  });
});

describe('invalidateAPIKey()', () => {
  it('returns null when security feature is disabled', async () => {
    const result = await invalidateAPIKey({
      body: {},
      loggers: loggingServiceMock.create(),
      callAsCurrentUser: mockCallAsCurrentUser,
      isSecurityFeatureDisabled: () => true,
    });
    expect(result).toBeNull();
    expect(mockCallAsCurrentUser).not.toHaveBeenCalled();
  });

  it('calls callCluster with proper body arguments', async () => {
    mockCallAsCurrentUser.mockResolvedValueOnce({
      invalidated_api_keys: ['api-key-id-1'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
    const result = await invalidateAPIKey({
      body: {
        id: '123',
        name: 'my-api-key',
        realm_name: 'native1',
        username: 'myuser',
      },
      loggers: loggingServiceMock.create(),
      callAsCurrentUser: mockCallAsCurrentUser,
      isSecurityFeatureDisabled: () => false,
    });
    expect(result).toEqual({
      invalidated_api_keys: ['api-key-id-1'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
    expect(mockCallAsCurrentUser).toHaveBeenCalledWith('shield.invalidateAPIKey', {
      body: {
        id: '123',
        name: 'my-api-key',
        realm_name: 'native1',
        username: 'myuser',
      },
    });
  });
});
