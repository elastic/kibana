/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toNumberArrayScalar } from './resolvers';

describe('Test ToNumberArray Scalar Resolver', () => {
  describe('#serialize', () => {
    test('Test Null Number', () => {
      expect(toNumberArrayScalar.serialize(null)).toEqual(null);
    });

    test('Test Undefined Number', () => {
      expect(toNumberArrayScalar.serialize(undefined)).toEqual(null);
    });

    test('Test NaN Number', () => {
      expect(toNumberArrayScalar.serialize(NaN)).toEqual([NaN]);
    });

    test('Test Basic Number', () => {
      expect(toNumberArrayScalar.serialize(5)).toEqual([5]);
    });

    test('Test Basic Number in an array', () => {
      expect(toNumberArrayScalar.serialize([5])).toEqual([5]);
    });

    test('Test Two Basic Numbers in an array', () => {
      expect(toNumberArrayScalar.serialize([5, 3])).toEqual([5, 3]);
    });

    test('Test Basic String', () => {
      expect(toNumberArrayScalar.serialize('33')).toEqual([33]);
    });

    test('Test Two Basic Strings in an array', () => {
      expect(toNumberArrayScalar.serialize(['33', '44'])).toEqual([33, 44]);
    });

    test('Test Two Basic Strings and a piece of text in an array', () => {
      expect(toNumberArrayScalar.serialize(['33', 'orange', '44'])).toEqual([33, NaN, 44]);
    });

    test('Test Basic Object to return NaN', () => {
      expect(toNumberArrayScalar.serialize({ hello: 'test' })).toEqual([NaN]);
    });

    test('Test more complicated Object to return NaN', () => {
      expect(
        toNumberArrayScalar.serialize({
          hello: 'test',
          me: 40,
          you: ['32', '34', null],
          others: [{ age: 78, name: 'unknown', lucky: true }],
          isNull: null,
        })
      ).toEqual([NaN]);
    });

    test('Test Array of Strings with some numbers, a null, and some text', () => {
      expect(
        toNumberArrayScalar.serialize(['5', 'you', '3', 'he', '20', 'we', null, '22', 'they'])
      ).toEqual([5, NaN, 3, NaN, 20, NaN, 22, NaN]);
    });

    test('Test Simple Circular Reference', () => {
      const circularReference = { myself: {} };
      circularReference.myself = circularReference;
      expect(toNumberArrayScalar.serialize(circularReference)).toEqual([NaN]);
    });
  });
});
