/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAPIKey } from './api_keys';
import { loggingServiceMock } from '../../../../../src/core/server/mocks';

const mockCallAsCurrentUser = jest.fn();

beforeAll(() => jest.resetAllMocks());

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
