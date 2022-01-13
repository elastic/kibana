/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAPIKeyForSyntheticsService } from './get_api_key';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { securityMock } from '../../../../security/server/mocks';
import { coreMock } from '../../../../../../src/core/server/mocks';
import { syntheticsServiceApiKey } from '../saved_objects/service_api_key';
import { KibanaRequest } from 'kibana/server';
import { UptimeServerSetup } from '../adapters';

describe('getAPIKeyTest', function () {
  const core = coreMock.createStart();
  const security = securityMock.createStart();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
  const request = {} as KibanaRequest;

  const server = {
    security,
    encryptedSavedObjects,
    savedObjectsClient: core.savedObjects.getScopedClient(request),
  } as unknown as UptimeServerSetup;

  security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValue(true);
  security.authc.apiKeys.create = jest.fn().mockReturnValue({
    id: 'test',
    name: 'service-api-key',
    api_key: 'qwerty',
    encoded: '@#$%^&',
  });

  it('should generate an api key and return it', async () => {
    const apiKey = await getAPIKeyForSyntheticsService({
      request,
      server,
    });

    expect(security.authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalledTimes(1);
    expect(security.authc.apiKeys.create).toHaveBeenCalledTimes(1);
    expect(security.authc.apiKeys.create).toHaveBeenCalledWith(
      {},
      {
        name: 'synthetics-api-key',
        role_descriptors: {
          synthetics_writer: {
            cluster: ['monitor', 'read_ilm', 'read_pipeline'],
            index: [
              {
                names: ['synthetics-*'],
                privileges: ['view_index_metadata', 'create_doc', 'auto_configure'],
              },
            ],
          },
        },
        metadata: {
          description:
            'Created for synthetics service to be passed to the heartbeat to communicate with ES',
        },
      }
    );
    expect(apiKey).toEqual({ apiKey: 'qwerty', id: 'test', name: 'service-api-key' });
  });

  it('should return existing api key', async () => {
    const getObject = jest
      .fn()
      .mockReturnValue({ attributes: { apiKey: 'qwerty', id: 'test', name: 'service-api-key' } });

    encryptedSavedObjects.getClient = jest.fn().mockReturnValue({
      getDecryptedAsInternalUser: getObject,
    });
    const apiKey = await getAPIKeyForSyntheticsService({
      request,
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
