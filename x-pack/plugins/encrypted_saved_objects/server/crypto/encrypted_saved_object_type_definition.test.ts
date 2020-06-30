/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';
import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';

it('correctly determines attribute properties', () => {
  const attributes = ['attr#1', 'attr#2', 'attr#3', 'attr#4'];
  const cases: Array<[
    EncryptedSavedObjectTypeRegistration,
    {
      shouldBeEncrypted: boolean[];
      shouldBeExcludedFromAAD: boolean[];
      shouldBeStripped: boolean[];
    }
  ]> = [
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set(['attr#1', 'attr#2', 'attr#3', 'attr#4']),
      },
      {
        shouldBeEncrypted: [true, true, true, true],
        shouldBeExcludedFromAAD: [true, true, true, true],
        shouldBeStripped: [true, true, true, true],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set(['attr#1', 'attr#2']),
      },
      {
        shouldBeEncrypted: [true, true, false, false],
        shouldBeExcludedFromAAD: [true, true, false, false],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set([{ key: 'attr#1' }, { key: 'attr#2' }]),
      },
      {
        shouldBeEncrypted: [true, true, false, false],
        shouldBeExcludedFromAAD: [true, true, false, false],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set(['attr#1', 'attr#2']),
        attributesToExcludeFromAAD: new Set(['attr#3']),
      },
      {
        shouldBeEncrypted: [true, true, false, false],
        shouldBeExcludedFromAAD: [true, true, true, false],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set([
          'attr#1',
          'attr#2',
          { key: 'attr#4', dangerouslyExposeValue: true },
        ]),
        attributesToExcludeFromAAD: new Set(['attr#3']),
      },
      {
        shouldBeEncrypted: [true, true, false, true],
        shouldBeExcludedFromAAD: [true, true, true, true],
        shouldBeStripped: [true, true, false, false],
      },
    ],
    [
      {
        type: 'so-type',
        attributesToEncrypt: new Set([
          { key: 'attr#1', dangerouslyExposeValue: true },
          'attr#2',
          { key: 'attr#4', dangerouslyExposeValue: true },
        ]),
        attributesToExcludeFromAAD: new Set(['some-other-attribute']),
      },
      {
        shouldBeEncrypted: [true, true, false, true],
        shouldBeExcludedFromAAD: [true, true, false, true],
        shouldBeStripped: [false, true, false, false],
      },
    ],
  ];

  for (const [typeRegistration, asserts] of cases) {
    const typeDefinition = new EncryptedSavedObjectAttributesDefinition(typeRegistration);
    for (const [attributeIndex, attributeName] of attributes.entries()) {
      expect(typeDefinition.shouldBeEncrypted(attributeName)).toBe(
        asserts.shouldBeEncrypted[attributeIndex]
      );
      expect(typeDefinition.shouldBeStripped(attributeName)).toBe(
        asserts.shouldBeStripped[attributeIndex]
      );
      expect(typeDefinition.shouldBeExcludedFromAAD(attributeName)).toBe(
        asserts.shouldBeExcludedFromAAD[attributeIndex]
      );
    }
  }
});
