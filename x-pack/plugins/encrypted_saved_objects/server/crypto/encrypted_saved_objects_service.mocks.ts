/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';

function createEncryptedSavedObjectsServiceMock() {
  return ({
    encryptAttributes: jest.fn(),
    decryptAttributes: jest.fn(),
    encryptAttributesSync: jest.fn(),
    decryptAttributesSync: jest.fn(),
  } as unknown) as jest.Mocked<EncryptedSavedObjectsService>;
}

export const encryptedSavedObjectsServiceMock = {
  create: createEncryptedSavedObjectsServiceMock,
};
