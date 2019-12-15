/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract, PluginStartContract } from './plugin';

function createEncryptedSavedObjectsSetupMock() {
  return {
    registerType: jest.fn(),
    __legacyCompat: { registerLegacyAPI: jest.fn() },
  } as jest.Mocked<PluginSetupContract>;
}

function createEncryptedSavedObjectsStartMock() {
  return {
    isEncryptionError: jest.fn(),
    getDecryptedAsInternalUser: jest.fn(),
  } as jest.Mocked<PluginStartContract>;
}

export const encryptedSavedObjectsMock = {
  createSetup: createEncryptedSavedObjectsSetupMock,
  createStart: createEncryptedSavedObjectsStartMock,
};
