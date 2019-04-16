/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toStringArrayScalar } from './resolvers';

describe('Test ToStringArray Scalar Resolver', () => {
  describe('#serialize', () => {
    test('Test Null String', () => {
      expect(toStringArrayScalar.serialize(null)).toEqual(null);
    });

    test('Test Undefined String', () => {
      expect(toStringArrayScalar.serialize(undefined)).toEqual(null);
    });

    test('Test Basic String', () => {
      expect(toStringArrayScalar.serialize('hello')).toEqual(['hello']);
    });

    test('Test Basic String in an array', () => {
      expect(toStringArrayScalar.serialize(['hello'])).toEqual(['hello']);
    });

    test('Test Two Basic Strings in an array', () => {
      expect(toStringArrayScalar.serialize(['hello', 'world'])).toEqual(['hello', 'world']);
    });

    test('Test Basic Number', () => {
      expect(toStringArrayScalar.serialize(33)).toEqual(['33']);
    });

    test('Test Basic Object', () => {
      expect(toStringArrayScalar.serialize({ hello: 'test' })).toEqual(['{"hello":"test"}']);
    });

    test('Test more complicated Object', () => {
      expect(
        toStringArrayScalar.serialize({
          hello: 'test',
          me: 40,
          you: ['32', '34', null],
          others: [{ age: 78, name: 'unknown', lucky: true }],
          isNull: null,
        })
      ).toEqual([
        '{"hello":"test","me":40,"you":["32","34",null],"others":[{"age":78,"name":"unknown","lucky":true}],"isNull":null}',
      ]);
    });

    test('Test Array of String', () => {
      expect(
        toStringArrayScalar.serialize(['me', 'you', 'she', 'he', 'it', 'we', null, 'you', 'they'])
      ).toEqual(['me', 'you', 'she', 'he', 'it', 'we', 'you', 'they']);
    });

    test('Test Array of number', () => {
      expect(toStringArrayScalar.serialize([10, 20, 30, null, 40, 50, 60, 70, 80])).toEqual([
        '10',
        '20',
        '30',
        '40',
        '50',
        '60',
        '70',
        '80',
      ]);
    });

    test('Test Array of number and string', () => {
      expect(
        toStringArrayScalar.serialize(['me', 20, 'you', 40, 'she', null, 60, 'he', 80])
      ).toEqual(['me', '20', 'you', '40', 'she', '60', 'he', '80']);
    });

    test('Test Array of Array', () => {
      expect(
        toStringArrayScalar.serialize([
          ['me', 20],
          ['you', 40, null],
          ['she', 60],
          ['he', 80],
          [undefined],
        ])
      ).toEqual([['me', '20'], ['you', '40'], ['she', '60'], ['he', '80'], []]);
    });

    test('Test Array of mix match of stuff', () => {
      expect(
        toStringArrayScalar.serialize([
          { hello: 'test' },
          {
            hello: 'test',
            me: null,
            you: ['32', '34'],
            others: [{ age: 78, name: 'unknown', lucky: true }],
          },
          undefined,
          'Unknown',
          80,
        ])
      ).toEqual([
        '{"hello":"test"}',
        '{"hello":"test","me":null,"you":["32","34"],"others":[{"age":78,"name":"unknown","lucky":true}]}',
        'Unknown',
        '80',
      ]);
    });

    test('Test Simple Circular Reference', () => {
      const circularReference = { myself: {} };
      circularReference.myself = circularReference;
      expect(toStringArrayScalar.serialize(circularReference)).toEqual(['Invalid Object']);
    });

    test('Test Simple Complex Circular Reference', () => {
      const circularReference = { myself: {} };
      circularReference.myself = circularReference;
      expect(toStringArrayScalar.serialize([10, 20, 30, 40, circularReference])).toEqual([
        '10',
        '20',
        '30',
        '40',
        'Invalid Object',
      ]);
    });
  });
});
