/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { bulkMarkApiKeysForInvalidation } from './bulk_mark_api_keys_for_invalidation';

describe('bulkMarkApiKeysForInvalidation', () => {
  test('should call savedObjectsClient bulkCreate with the proper params', async () => {
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });

    await bulkMarkApiKeysForInvalidation(
      { apiKeys: [Buffer.from('123').toString('base64'), Buffer.from('456').toString('base64')] },
      loggingSystemMock.create().get(),
      unsecuredSavedObjectsClient
    );

    const bulkCreateCallMock = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0];
    const savedObjects = bulkCreateCallMock[0];

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(bulkCreateCallMock).toHaveLength(1);

    expect(savedObjects).toHaveLength(2);
    expect(savedObjects[0]).toHaveProperty('type', 'api_key_pending_invalidation');
    expect(savedObjects[0]).toHaveProperty('attributes.apiKeyId', '123');
    expect(savedObjects[0]).toHaveProperty('attributes.createdAt', expect.any(String));
    expect(savedObjects[1]).toHaveProperty('type', 'api_key_pending_invalidation');
    expect(savedObjects[1]).toHaveProperty('attributes.apiKeyId', '456');
    expect(savedObjects[1]).toHaveProperty('attributes.createdAt', expect.any(String));
  });

  test('should log the proper error when savedObjectsClient create failed', async () => {
    const logger = loggingSystemMock.create().get();
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    unsecuredSavedObjectsClient.bulkCreate.mockRejectedValueOnce(new Error('Fail'));
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: [Buffer.from('123').toString('base64'), Buffer.from('456').toString('base64')] },
      logger,
      unsecuredSavedObjectsClient
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to bulk mark list of API keys ["MTIz", "NDU2"] for invalidation: Fail'
    );
  });
});
