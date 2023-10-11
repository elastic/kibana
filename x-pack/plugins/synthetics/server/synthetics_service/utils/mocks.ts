/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { cloneDeep } from 'lodash';

export const mockEncryptedSO = (
  data: any = [{ attributes: { key: 'username', value: 'elastic' }, namespaces: ['*'] }]
) => {
  const result = cloneDeep(data);
  return {
    isEncryptionError: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(data),
      createPointInTimeFinderDecryptedAsInternalUser: jest
        .fn()
        .mockImplementation(({ perPage }) => ({
          close: jest.fn(),
          find: jest.fn().mockReturnValue({
            async *[Symbol.asyncIterator]() {
              if (!perPage) {
                yield {
                  saved_objects: result,
                };
                return;
              }
              if (data === null) {
                return;
              }
              do {
                const currentPage = result.splice(0, perPage);
                if (currentPage.length === 0) {
                  return;
                }
                yield {
                  saved_objects: currentPage,
                };
              } while (result.length > 0);
            },
          }),
        })),
    } as jest.Mocked<EncryptedSavedObjectsClient>),
  };
};
