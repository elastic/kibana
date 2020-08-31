/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toDateArrayScalar } from './resolvers';

describe('Test ToDateArray Scalar Resolver', () => {
  describe('#serialize', () => {
    test('Test Null Number', () => {
      expect(toDateArrayScalar.serialize(null)).toEqual(null);
    });

    test('Test Undefined Number', () => {
      expect(toDateArrayScalar.serialize(undefined)).toEqual(null);
    });

    test('Test NaN Number', () => {
      expect(toDateArrayScalar.serialize(NaN)).toEqual([NaN]);
    });

    test('Test Basic Date String', () => {
      expect(toDateArrayScalar.serialize('2019-04-16T03:14:13.704Z')).toEqual([
        '2019-04-16T03:14:13.704Z',
      ]);
    });

    test('Test Basic Date Number as String', () => {
      expect(toDateArrayScalar.serialize('1555384642768')).toEqual(['2019-04-16T03:17:22.768Z']);
    });

    test('Test Basic Date String in an array', () => {
      expect(toDateArrayScalar.serialize(['2019-04-16T03:14:13.704Z'])).toEqual([
        '2019-04-16T03:14:13.704Z',
      ]);
    });

    test('Test Two Basic Date Strings in an array', () => {
      expect(
        toDateArrayScalar.serialize(['2019-04-16T03:14:13.704Z', '2019-05-16T03:14:13.704Z'])
      ).toEqual(['2019-04-16T03:14:13.704Z', '2019-05-16T03:14:13.704Z']);
    });

    test('Test Basic Numbers in an array', () => {
      expect(toDateArrayScalar.serialize([1555384642768, 1555384453704])).toEqual([
        '2019-04-16T03:17:22.768Z',
        '2019-04-16T03:14:13.704Z',
      ]);
    });

    test('Mix of Basic Numbers and strings in an array', () => {
      expect(
        toDateArrayScalar.serialize([1555384642768, '2019-05-16T03:14:13.704Z', 1555384453704])
      ).toEqual([
        '2019-04-16T03:17:22.768Z',
        '2019-05-16T03:14:13.704Z',
        '2019-04-16T03:14:13.704Z',
      ]);
    });

    test('Test Simple Object', () => {
      expect(toDateArrayScalar.serialize({})).toEqual(['invalid date']);
    });

    test('Test Simple Circular Reference', () => {
      const circularReference = { myself: {} };
      circularReference.myself = circularReference;
      expect(toDateArrayScalar.serialize(circularReference)).toEqual(['invalid date']);
    });

    test('Test Array of Strings with some numbers, a null, and some text', () => {
      expect(
        toDateArrayScalar.serialize([
          '1555384453704',
          'you',
          1555384642768,
          'he',
          'we',
          null,
          'they',
        ])
      ).toEqual([
        '2019-04-16T03:14:13.704Z',
        'you',
        '2019-04-16T03:17:22.768Z',
        'he',
        'we',
        'they',
      ]);
    });
  });
});
