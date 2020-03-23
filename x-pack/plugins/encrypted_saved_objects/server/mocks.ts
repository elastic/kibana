/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from './plugin';

function createEncryptedSavedObjectsSetupMock() {
  return {
    registerType: jest.fn(),
    __legacyCompat: { registerLegacyAPI: jest.fn() },
    usingEphemeralEncryptionKey: true,
  } as jest.Mocked<EncryptedSavedObjectsPluginSetup>;
}

function createEncryptedSavedObjectsStartMock() {
  return {
    isEncryptionError: jest.fn(),
    getDecryptedAsInternalUser: jest.fn(),
  } as jest.Mocked<EncryptedSavedObjectsPluginStart>;
}

export const encryptedSavedObjectsMock = {
  createSetup: createEncryptedSavedObjectsSetupMock,
  createStart: createEncryptedSavedObjectsStartMock,
};
