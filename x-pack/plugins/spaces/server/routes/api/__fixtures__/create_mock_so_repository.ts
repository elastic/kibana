/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from 'src/core/server';

export const createMockSavedObjectsRepository = (spaces: any[] = []) => {
  const mockSavedObjectsClientContract = ({
    get: jest.fn((type, id) => {
      const result = spaces.filter(s => s.id === id);
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
      if (spaces.find(s => s.id === id)) {
        throw SavedObjectsErrorHelpers.decorateConflictError(new Error(), 'space conflict');
      }
      return {};
    }),
    update: jest.fn((type, id) => {
      if (!spaces.find(s => s.id === id)) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {};
    }),
    delete: jest.fn((type: string, id: string) => {
      return {};
    }),
    deleteByNamespace: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectsClientContract>;

  return mockSavedObjectsClientContract;
};
