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

function createEncryptedSavedObjectsServiceMock() {
  return ({
    isRegistered: jest.fn(),
    stripOrDecryptAttributes: jest.fn(),
    encryptAttributes: jest.fn(),
    decryptAttributes: jest.fn(),
    encryptAttributesSync: jest.fn(),
    decryptAttributesSync: jest.fn(),
  } as unknown) as jest.Mocked<EncryptedSavedObjectsService>;
}

export const encryptedSavedObjectsServiceMock = {
  create: createEncryptedSavedObjectsServiceMock,
  createWithTypes(registrations: EncryptedSavedObjectTypeRegistration[] = []) {
    const mock = createEncryptedSavedObjectsServiceMock();

    function processAttributes<T extends Record<string, any>>(
      descriptor: Pick<SavedObjectDescriptor, 'type'>,
      attrs: T,
      action: (attrs: T, attrName: string, shouldExpose: boolean) => void
    ) {
      const registration = registrations.find((r) => r.type === descriptor.type);
      if (!registration) {
        return attrs;
      }

      const clonedAttrs = { ...attrs };
      for (const attr of registration.attributesToEncrypt) {
        const [attrName, shouldExpose] =
          typeof attr === 'string'
            ? [attr, false]
            : [attr.key, attr.dangerouslyExposeValue === true];
        if (attrName in clonedAttrs) {
          action(clonedAttrs, attrName, shouldExpose);
        }
      }
      return clonedAttrs;
    }

    mock.isRegistered.mockImplementation(
      (type) => registrations.findIndex((r) => r.type === type) >= 0
    );
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
    mock.stripOrDecryptAttributes.mockImplementation((descriptor, attrs) =>
      Promise.resolve({
        attributes: processAttributes(descriptor, attrs, (clonedAttrs, attrName, shouldExpose) => {
          if (shouldExpose) {
            clonedAttrs[attrName] = (clonedAttrs[attrName] as string).slice(1, -1);
          } else {
            delete clonedAttrs[attrName];
          }
        }),
      })
    );

    return mock;
  },
};
