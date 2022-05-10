/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAPIKeyForSyntheticsService } from './get_api_key';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { syntheticsServiceApiKey } from '../saved_objects/service_api_key';
import { KibanaRequest } from '@kbn/core/server';
import { UptimeServerSetup } from '../adapters';
import { getUptimeESMockClient } from '../requests/helper';

describe('getAPIKeyTest', function () {
  const core = coreMock.createStart();
  const security = securityMock.createStart();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
  const request = {} as KibanaRequest;

  const server = {
    security,
    encryptedSavedObjects,
    savedObjectsClient: core.savedObjects.getScopedClient(request),
    uptimeEsClient: getUptimeESMockClient().uptimeEsClient,
  } as unknown as UptimeServerSetup;

  security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValue(true);
  security.authc.apiKeys.create = jest.fn().mockReturnValue({
    id: 'test',
    name: 'service-api-key',
    api_key: 'qwerty',
    encoded: '@#$%^&',
  });

  it('should return existing api key', async () => {
    const getObject = jest
      .fn()
      .mockReturnValue({ attributes: { apiKey: 'qwerty', id: 'test', name: 'service-api-key' } });

    encryptedSavedObjects.getClient = jest.fn().mockReturnValue({
      getDecryptedAsInternalUser: getObject,
    });
    const apiKey = await getAPIKeyForSyntheticsService({
      server,
    });

    expect(apiKey).toEqual({ apiKey: 'qwerty', id: 'test', name: 'service-api-key' });

    expect(encryptedSavedObjects.getClient).toHaveBeenCalledTimes(1);
    expect(getObject).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjects.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });
    expect(getObject).toHaveBeenCalledWith(
      'uptime-synthetics-api-key',
      'ba997842-b0cf-4429-aa9d-578d9bf0d391'
    );
  });
});
