/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { markApiKeyForInvalidation } from './mark_api_key_for_invalidation';

describe('markApiKeyForInvalidation', () => {
  test('should call savedObjectsClient create with the proper params', async () => {
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    await markApiKeyForInvalidation(
      { apiKey: Buffer.from('123:abc').toString('base64') },
      loggingSystemMock.create().get(),
      unsecuredSavedObjectsClient
    );
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toHaveLength(2);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toEqual(
      'api_key_pending_invalidation'
    );
  });

  test('should log the proper error when savedObjectsClient create failed', async () => {
    const logger = loggingSystemMock.create().get();
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));
    await markApiKeyForInvalidation(
      { apiKey: Buffer.from('123').toString('base64') },
      logger,
      unsecuredSavedObjectsClient
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to mark for API key [id="MTIz"] for invalidation: Fail'
    );
  });
});
