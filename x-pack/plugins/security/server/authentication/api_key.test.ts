/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createApiKey } from './api_key';

const mockCallCluster = jest.fn();

beforeAll(() => jest.resetAllMocks());

describe('createApiKey()', () => {
  test('returns null when security feature is disabled', async () => {
    const result = await createApiKey({
      body: {
        name: '',
        role_descriptors: {},
      },
      callCluster: mockCallCluster,
      isSecurityFeatureDisabled: () => true,
    });
    expect(result).toBeNull();
  });

  test('calls callCluster with proper body arguments', async () => {
    mockCallCluster.mockResolvedValueOnce({
      id: '123',
      name: 'key-name',
      expiration: '1d',
      api_key: 'abc123',
    });
    const result = await createApiKey({
      body: {
        name: 'key-name',
        role_descriptors: { foo: true },
        expiration: '1d',
      },
      callCluster: mockCallCluster,
      isSecurityFeatureDisabled: () => false,
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "api_key": "abc123",
        "expiration": "1d",
        "id": "123",
        "name": "key-name",
      }
    `);
    expect(mockCallCluster).toHaveBeenCalledWith('shield.createApiKey', {
      body: {
        name: 'key-name',
        role_descriptors: { foo: true },
        expiration: '1d',
      },
    });
  });
});
