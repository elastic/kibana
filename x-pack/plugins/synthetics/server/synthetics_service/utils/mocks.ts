/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

export const mockEncryptedSO = {
  getClient: jest.fn().mockReturnValue({
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockImplementation(() => ({
      close: jest.fn(),
      find: jest.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { saved_objects: [{ attributes: { key: 'username', value: 'elastic' } }] };
        },
      }),
    })),
  } as jest.Mocked<EncryptedSavedObjectsClient>),
};
