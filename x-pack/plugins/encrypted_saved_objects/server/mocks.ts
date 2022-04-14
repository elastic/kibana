/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from './plugin';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsClientOptions,
} from './saved_objects';

function createEncryptedSavedObjectsSetupMock(
  { canEncrypt }: { canEncrypt: boolean } = { canEncrypt: false }
) {
  return {
    registerType: jest.fn(),
    __legacyCompat: { registerLegacyAPI: jest.fn() },
    canEncrypt,
    createMigration: jest.fn(),
  } as jest.Mocked<EncryptedSavedObjectsPluginSetup>;
}

function createEncryptedSavedObjectsStartMock() {
  return {
    isEncryptionError: jest.fn(),
    getClient: jest.fn((opts) => createEncryptedSavedObjectsClientMock(opts)),
  } as jest.Mocked<EncryptedSavedObjectsPluginStart>;
}

function createEncryptedSavedObjectsClientMock(opts?: EncryptedSavedObjectsClientOptions) {
  return {
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderAsInternalUser: jest.fn(),
  } as jest.Mocked<EncryptedSavedObjectsClient>;
}

export const encryptedSavedObjectsMock = {
  createSetup: createEncryptedSavedObjectsSetupMock,
  createStart: createEncryptedSavedObjectsStartMock,
  createClient: createEncryptedSavedObjectsClientMock,
};
