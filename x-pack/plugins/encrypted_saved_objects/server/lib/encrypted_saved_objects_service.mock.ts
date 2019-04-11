/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';

export const encryptedSavedObjectsServiceMock: jest.Mocked<
  PublicMethodsOf<EncryptedSavedObjectsService>
> = {
  decryptAttributes: jest.fn().mockResolvedValue(undefined as any),
  encryptAttributes: jest.fn().mockResolvedValue(undefined as any),
  isRegistered: jest.fn().mockReturnValue(false),
  stripEncryptedAttributes: jest.fn(),
  registerType: jest.fn(),
};
