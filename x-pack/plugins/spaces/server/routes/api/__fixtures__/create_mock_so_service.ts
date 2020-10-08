/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsUpdateResponse, SavedObjectsErrorHelpers } from 'src/core/server';
import {
  coreMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
} from '../../../../../../../src/core/server/mocks';

export const createMockSavedObjectsService = (spaces: any[] = []) => {
  const typeRegistry = savedObjectsTypeRegistryMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.get.mockImplementation((type, id) => {
    const result = spaces.filter((s) => s.id === id);
    if (!result.length) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return Promise.resolve(result[0]);
  });
  savedObjectsClient.find.mockResolvedValue({
    page: 1,
    per_page: 20,
    total: spaces.length,
    saved_objects: spaces,
  });
  savedObjectsClient.create.mockImplementation((_type, _attributes, options) => {
    if (spaces.find((s) => s.id === options?.id)) {
      throw SavedObjectsErrorHelpers.decorateConflictError(new Error(), 'space conflict');
    }
    return Promise.resolve({} as SavedObject);
  });
  savedObjectsClient.update.mockImplementation((type, id, _attributes, _options) => {
    if (!spaces.find((s) => s.id === id)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return Promise.resolve({} as SavedObjectsUpdateResponse);
  });

  const { savedObjects } = coreMock.createStart();
  savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);
  savedObjects.getScopedClient.mockReturnValue(savedObjectsClient);

  return { savedObjects, typeRegistry, savedObjectsClient };
};
