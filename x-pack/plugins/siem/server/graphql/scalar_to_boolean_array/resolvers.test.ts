/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toBooleanArrayScalar } from './resolvers';

describe('Test ToBooleanArray Scalar Resolver', () => {
  describe('#serialize', () => {
    test('Test Null Boolean', () => {
      expect(toBooleanArrayScalar.serialize(null)).toEqual(null);
    });

    test('Test Undefined Boolean', () => {
      expect(toBooleanArrayScalar.serialize(undefined)).toEqual(null);
    });

    test('Test NaN Number', () => {
      expect(toBooleanArrayScalar.serialize(NaN)).toEqual([false]);
    });

    test('Test Basic false Boolean', () => {
      expect(toBooleanArrayScalar.serialize(false)).toEqual([false]);
    });

    test('Test Basic true Boolean', () => {
      expect(toBooleanArrayScalar.serialize(true)).toEqual([true]);
    });

    test('Test Basic false Boolean string', () => {
      expect(toBooleanArrayScalar.serialize('false')).toEqual([false]);
    });

    test('Test Basic true Boolean string', () => {
      expect(toBooleanArrayScalar.serialize('true')).toEqual([true]);
    });

    test('Test Basic true Boolean string with weird letters', () => {
      expect(toBooleanArrayScalar.serialize('tRuE')).toEqual([true]);
    });

    test('Test Basic true Boolean string with just the letter T', () => {
      expect(toBooleanArrayScalar.serialize('T')).toEqual([true]);
    });

    test('Test Basic true Boolean string with just the letter t', () => {
      expect(toBooleanArrayScalar.serialize('t')).toEqual([true]);
    });

    test('Test string with gibberish returning false', () => {
      expect(toBooleanArrayScalar.serialize('some gibberish')).toEqual([false]);
    });

    test('Test Basic false Boolean in array', () => {
      expect(toBooleanArrayScalar.serialize([false])).toEqual([false]);
    });

    test('Test Basic true Boolean in array', () => {
      expect(toBooleanArrayScalar.serialize([true])).toEqual([true]);
    });

    test('Test Basic false Boolean string in array', () => {
      expect(toBooleanArrayScalar.serialize(['false'])).toEqual([false]);
    });

    test('Test Basic true Boolean string in array', () => {
      expect(toBooleanArrayScalar.serialize(['true'])).toEqual([true]);
    });

    test('Test number with 0 returning false', () => {
      expect(toBooleanArrayScalar.serialize(0)).toEqual([false]);
    });

    test('Test number with 1 returning returning true', () => {
      expect(toBooleanArrayScalar.serialize(1)).toEqual([true]);
    });

    test('Test array with 0 and 1 returning true and false', () => {
      expect(toBooleanArrayScalar.serialize([0, 1, 1, 0, 1])).toEqual([
        false,
        true,
        true,
        false,
        true,
      ]);
    });

    test('Test Simple Object returning false', () => {
      expect(toBooleanArrayScalar.serialize({})).toEqual([false]);
    });

    test('Test Simple Circular Reference returning false', () => {
      const circularReference = { myself: {} };
      circularReference.myself = circularReference;
      expect(toBooleanArrayScalar.serialize(circularReference)).toEqual([false]);
    });

    test('Test Array of Strings with some numbers, a null, and some text and a boolean', () => {
      expect(
        toBooleanArrayScalar.serialize([
          5,
          'you',
          '1',
          'he',
          '20',
          'we',
          null,
          '22',
          'they',
          'True',
          'T',
          't',
        ])
      ).toEqual([true, false, false, false, false, false, false, false, true, true, true]);
    });
  });
});
