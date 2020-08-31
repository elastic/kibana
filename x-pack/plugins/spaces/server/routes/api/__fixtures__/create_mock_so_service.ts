/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from 'src/core/server';
import { coreMock, savedObjectsTypeRegistryMock } from '../../../../../../../src/core/server/mocks';

export const createMockSavedObjectsService = (spaces: any[] = []) => {
  const mockSavedObjectsClientContract = ({
    get: jest.fn((type, id) => {
      const result = spaces.filter((s) => s.id === id);
      if (!result.length) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return result[0];
    }),
    find: jest.fn(() => {
      return {
        total: spaces.length,
        saved_objects: spaces,
      };
    }),
    create: jest.fn((type, attributes, { id }) => {
      if (spaces.find((s) => s.id === id)) {
        throw SavedObjectsErrorHelpers.decorateConflictError(new Error(), 'space conflict');
      }
      return {};
    }),
    update: jest.fn((type, id) => {
      if (!spaces.find((s) => s.id === id)) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {};
    }),
    delete: jest.fn((type: string, id: string) => {
      return {};
    }),
    deleteByNamespace: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectsClientContract>;

  const { savedObjects } = coreMock.createStart();

  const typeRegistry = savedObjectsTypeRegistryMock.create();
  savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);

  savedObjects.getScopedClient.mockReturnValue(mockSavedObjectsClientContract);

  return savedObjects;
};
