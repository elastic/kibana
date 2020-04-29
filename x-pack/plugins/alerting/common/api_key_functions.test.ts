/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request } from 'hapi';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { securityMock } from '../../security/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest } from '../../../../src/core/server';
import { createAPIKey, invalidateAPIKey } from './api_key_functions';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
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

test('invalidateAPIKey() returns an API key when security is enabled', async () => {
  securityPluginSetup!.authc.invalidateAPIKeyAsInternalUser.mockResolvedValue({
    invalidated_api_keys: ['abc'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  const invalidateAPIKeyResult = await invalidateAPIKey({ id: 'abc' }, securityPluginSetup);

  expect(invalidateAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { invalidated_api_keys: ['abc'], previously_invalidated_api_keys: [], error_count: 0 },
  });
});
