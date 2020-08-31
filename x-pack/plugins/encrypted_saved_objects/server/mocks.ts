/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from './plugin';
import { EncryptedSavedObjectsClient, EncryptedSavedObjectsClientOptions } from './saved_objects';

function createEncryptedSavedObjectsSetupMock() {
  return {
    registerType: jest.fn(),
    __legacyCompat: { registerLegacyAPI: jest.fn() },
    usingEphemeralEncryptionKey: true,
    createMigration: jest.fn(),
  } as jest.Mocked<EncryptedSavedObjectsPluginSetup>;
}

function createEncryptedSavedObjectsStartMock() {
  return {
    isEncryptionError: jest.fn(),
    getClient: jest.fn((opts) => createEncryptedSavedObjectsClienttMock(opts)),
  } as jest.Mocked<EncryptedSavedObjectsPluginStart>;
}

function createEncryptedSavedObjectsClienttMock(opts?: EncryptedSavedObjectsClientOptions) {
  return {
    getDecryptedAsInternalUser: jest.fn(),
  } as jest.Mocked<EncryptedSavedObjectsClient>;
}

export const encryptedSavedObjectsMock = {
  createSetup: createEncryptedSavedObjectsSetupMock,
  createStart: createEncryptedSavedObjectsStartMock,
  createClient: createEncryptedSavedObjectsClienttMock,
};
