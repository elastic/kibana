/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import {
  extractSavedObjectReferences,
  resolveSavedObjectReferences,
  SavedObjectAttributesWithReferences,
} from './references';

it('extractSavedObjectReferences extracts references using the given extractors', () => {
  const { attributes, references } = extractSavedObjectReferences([
    extractReferenceA,
    extractReferenceB,
  ])({
    a: 'id-a',
    b: 'id-b',
    c: 'something-else',
  });

  expect(references).toMatchObject([
    { id: 'id-a', name: REFERENCE_A_NAME, type: 'some-reference' },
    { id: 'id-b', name: REFERENCE_B_NAME, type: 'some-reference' },
  ]);
  expect(attributes).toMatchObject({
    a: REFERENCE_A_NAME,
    b: REFERENCE_B_NAME,
    c: 'something-else',
  });
});

it('resolveSavedObjectReferences resolves references using the given resolvers', () => {
  const attributes = resolveSavedObjectReferences([resolveReferenceA, resolveReferenceB])(
    {
      a: REFERENCE_A_NAME,
      b: REFERENCE_B_NAME,
      c: 'something-else',
    },
    [
      { id: 'id-a', name: REFERENCE_A_NAME, type: 'some-reference' },
      { id: 'id-b', name: REFERENCE_B_NAME, type: 'some-reference' },
    ]
  );

  expect(attributes).toMatchObject({
    a: 'id-a',
    b: 'id-b',
    c: 'something-else',
  });
});

interface TestSavedObjectAttributes {
  a: string;
  b: string;
  c: string;
}

const REFERENCE_A_NAME = 'reference-a';
const REFERENCE_B_NAME = 'reference-b';

const extractReferenceA = (
  attributes: TestSavedObjectAttributes
): SavedObjectAttributesWithReferences<TestSavedObjectAttributes> => ({
  attributes: { ...attributes, a: REFERENCE_A_NAME },
  references: [
    {
      id: attributes.a,
      name: REFERENCE_A_NAME,
      type: 'some-reference',
    },
  ],
});

const extractReferenceB = (
  attributes: TestSavedObjectAttributes
): SavedObjectAttributesWithReferences<TestSavedObjectAttributes> => ({
  attributes: { ...attributes, b: REFERENCE_B_NAME },
  references: [
    {
      id: attributes.b,
      name: REFERENCE_B_NAME,
      type: 'some-reference',
    },
  ],
});

const resolveReferenceA = (
  attributes: TestSavedObjectAttributes,
  references: SavedObjectReference[]
): TestSavedObjectAttributes => {
  const referenceA = references.find((reference) => reference.name === REFERENCE_A_NAME);

  if (referenceA != null) {
    return {
      ...attributes,
      a: referenceA.id,
    };
  } else {
    return attributes;
  }
};

const resolveReferenceB = (
  attributes: TestSavedObjectAttributes,
  references: SavedObjectReference[]
): TestSavedObjectAttributes => {
  const referenceB = references.find((reference) => reference.name === REFERENCE_B_NAME);

  if (referenceB != null) {
    return {
      ...attributes,
      b: referenceB.id,
    };
  } else {
    return attributes;
  }
};
