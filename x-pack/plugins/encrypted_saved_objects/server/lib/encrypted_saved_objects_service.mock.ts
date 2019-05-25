/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  SavedObjectDescriptor,
} from './encrypted_saved_objects_service';

export function createEncryptedSavedObjectsServiceMock(
  registrations: EncryptedSavedObjectTypeRegistration[] = []
) {
  const mock: jest.Mocked<EncryptedSavedObjectsService> = new (jest.requireMock(
    './encrypted_saved_objects_service'
  )).EncryptedSavedObjectsService();

  function processAttributes<T extends Record<string, any>>(
    descriptor: Pick<SavedObjectDescriptor, 'type'>,
    attrs: T,
    action: (attrs: T, attrName: string) => void
  ) {
    const registration = registrations.find(r => r.type === descriptor.type);
    if (!registration) {
      return attrs;
    }

    const clonedAttrs = { ...attrs };
    for (const attrName of registration.attributesToEncrypt) {
      if (attrName in clonedAttrs) {
        action(clonedAttrs, attrName);
      }
    }
    return clonedAttrs;
  }

  mock.isRegistered.mockImplementation(type => registrations.findIndex(r => r.type === type) >= 0);
  mock.encryptAttributes.mockImplementation(async (descriptor, attrs) =>
    processAttributes(
      descriptor,
      attrs,
      (clonedAttrs, attrName) => (clonedAttrs[attrName] = `*${clonedAttrs[attrName]}*`)
    )
  );
  mock.decryptAttributes.mockImplementation(async (descriptor, attrs) =>
    processAttributes(
      descriptor,
      attrs,
      (clonedAttrs, attrName) =>
        (clonedAttrs[attrName] = (clonedAttrs[attrName] as string).slice(1, -1))
    )
  );
  mock.stripEncryptedAttributes.mockImplementation((type, attrs) =>
    processAttributes({ type }, attrs, (clonedAttrs, attrName) => delete clonedAttrs[attrName])
  );

  return mock;
}
