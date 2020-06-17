/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsMigrationService } from './encrypted_saved_objects_migration_service';

function createEncryptedSavedObjectsMigrationServiceMock() {
  return ({
    encryptAttributes: jest.fn(),
    decryptAttributes: jest.fn(),
  } as unknown) as jest.Mocked<EncryptedSavedObjectsMigrationService>;
}

export const encryptedSavedObjectsMigrationServiceMock = {
  create: createEncryptedSavedObjectsMigrationServiceMock,
};
