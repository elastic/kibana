/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetDescriptorNamespace } from './saved_objects_encryption_extension.test.mocks';

import { savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';

import { encryptedSavedObjectsServiceMock } from '../crypto/encrypted_saved_objects_service.mocks';
import { SavedObjectsEncryptionExtension } from './saved_objects_encryption_extension';

const KNOWN_TYPE = 'known-type';
const ATTRIBUTE_TO_STRIP = 'attrSecret';
const ATTRIBUTE_TO_DECRYPT = 'attrNotSoSecret';
const DESCRIPTOR_NAMESPACE = 'descriptor-namespace';
const CURRENT_USER = 'current-user';

beforeAll(() => {
  // Mock the getDescriptorNamespace result so we don't exercise that functionality in these unit tests
  mockGetDescriptorNamespace.mockReturnValue(DESCRIPTOR_NAMESPACE);
});

function setup() {
  const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
  const mockService = encryptedSavedObjectsServiceMock.createWithTypes([
    {
      type: KNOWN_TYPE,
      attributesToEncrypt: new Set([
        ATTRIBUTE_TO_STRIP,
        { key: ATTRIBUTE_TO_DECRYPT, dangerouslyExposeValue: true },
      ]),
    },
  ]);
  return {
    extension: new SavedObjectsEncryptionExtension({
      baseTypeRegistry: mockBaseTypeRegistry,
      service: mockService,
      getCurrentUser: jest.fn().mockReturnValue(CURRENT_USER),
    }),
  };
}

describe('isEncryptableType', () => {
  test('returns true for known types', () => {
    const { extension } = setup();
    expect(extension.isEncryptableType(KNOWN_TYPE)).toBe(true);
  });

  test('returns false for unknown types', () => {
    const { extension } = setup();
    expect(extension.isEncryptableType('unknown-type')).toBe(false);
  });
});

test.todo('#decryptOrStripResponseAttributes');

test.todo('#encryptAttributes');
