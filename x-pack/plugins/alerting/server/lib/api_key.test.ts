/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request } from 'hapi';
import { securityMock } from '../../../security/server/mocks';
import { KibanaRequest } from '../../../../../src/core/server';
import {
  createAPIKey,
  invalidateAPIKeyById,
  getApiKeyForAlertPermissions,
  invalidateAPIKey,
} from './api_key';
import { savedObjectsClientMock } from 'src/core/server/mocks';

const savedObjectsClient = savedObjectsClientMock.create();
const securityPluginSetup = securityMock.createSetup();

const fakeRequest = ({
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: () => savedObjectsClient,
} as unknown) as Request;

test('createAPIKey() returns an API key when security is enabled', async () => {
  securityPluginSetup.authc.grantAPIKeyAsInternalUser.mockResolvedValueOnce({
    api_key: '123',
    id: 'abc',
    name: '',
  });
  const createAPIKeyResult = await createAPIKey(
    KibanaRequest.from(fakeRequest),
    securityPluginSetup
  );

  expect(createAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { api_key: '123', id: 'abc', name: '' },
  });
});

test('createAPIKey() returns false when security is disabled', async () => {
  const createAPIKeyResult = await createAPIKey(KibanaRequest.from(fakeRequest));

  expect(createAPIKeyResult).toEqual({
    apiKeysEnabled: false,
  });
});

test('getApiKeyForAlertPermissions() returns an API key when security is enabled', async () => {
  securityPluginSetup.authc.grantAPIKeyAsInternalUser.mockResolvedValueOnce({
    api_key: '123',
    id: 'abc',
    name: '',
  });
  const apiKeyResult = await getApiKeyForAlertPermissions(
    'test/123',
    '123:abc',
    securityPluginSetup
  );

  expect(apiKeyResult).toEqual(Buffer.from('abc:123').toString('base64'));
});

test('invalidateAPIKeyById() returns an API key when security is enabled', async () => {
  securityPluginSetup!.authc.invalidateAPIKeyAsInternalUser.mockResolvedValue({
    invalidated_api_keys: ['abc'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  const invalidateAPIKeyResult = await invalidateAPIKeyById({ id: 'abc' }, securityPluginSetup);

  expect(invalidateAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { invalidated_api_keys: ['abc'], previously_invalidated_api_keys: [], error_count: 0 },
  });
});

test('invalidateAPIKeyById() returns false when security is disabled', async () => {
  const invalidateAPIKeyResult = await invalidateAPIKeyById({ id: 'abc' });

  expect(invalidateAPIKeyResult).toEqual({
    apiKeysEnabled: false,
  });
});

test('invalidateAPIKey() returns an API key when security is enabled', async () => {
  securityPluginSetup!.authc.invalidateAPIKeyAsInternalUser.mockResolvedValue({
    invalidated_api_keys: ['abc'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  const invalidateAPIKeyResult = await invalidateAPIKey(
    { apiKey: Buffer.from('123:abc').toString('base64') },
    securityPluginSetup
  );

  expect(invalidateAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { invalidated_api_keys: ['abc'], previously_invalidated_api_keys: [], error_count: 0 },
  });
});

test('invalidateAPIKey() returns false when security is disabled', async () => {
  const invalidateAPIKeyResult = await invalidateAPIKey({
    apiKey: Buffer.from('123:abc').toString('base64'),
  });

  expect(invalidateAPIKeyResult).toEqual({
    apiKeysEnabled: false,
  });
});
