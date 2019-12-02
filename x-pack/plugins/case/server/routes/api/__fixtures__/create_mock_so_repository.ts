/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from 'src/core/server';

export const createMockSavedObjectsRepository = (savedObject: any[] = []) => {
  const mockSavedObjectsClientContract = ({
    get: jest.fn((type, id) => {
      const result = savedObject.filter(s => s.id === id);
      if (!result.length) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return result[0];
    }),
    find: jest.fn(findArgs => {
      if (findArgs.hasReference && findArgs.hasReference.id === 'bad-guy') {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }
      return {
        total: savedObject.length,
        saved_objects: savedObject,
      };
    }),
    create: jest.fn((type, attributes, { id }) => {
      if (savedObject.find(s => s.id === id)) {
        throw SavedObjectsErrorHelpers.decorateConflictError(new Error(), 'case conflict');
      }
      return {};
    }),
    update: jest.fn((type, id) => {
      if (!savedObject.find(s => s.id === id)) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {};
    }),
    delete: jest.fn((type: string, id: string) => {
      const result = savedObject.filter(s => s.id === id);
      if (!result.length) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      if (type === 'case-workflow-comment' && id === 'bad-guy') {
        throw SavedObjectsErrorHelpers.createBadRequestError('Error thrown for testing');
      }
      return {};
    }),
    deleteByNamespace: jest.fn(),
  } as unknown) as jest.Mocked<SavedObjectsClientContract>;

  return mockSavedObjectsClientContract;
};
