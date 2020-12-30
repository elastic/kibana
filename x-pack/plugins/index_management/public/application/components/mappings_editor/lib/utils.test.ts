/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../constants', () => {
  const { TYPE_DEFINITION } = jest.requireActual('../constants');
  return { MAIN_DATA_TYPE_DEFINITION: {}, TYPE_DEFINITION };
});

import { stripUndefinedValues, getTypeLabelFromField } from './utils';

describe('utils', () => {
  describe('stripUndefinedValues()', () => {
    test('should remove all undefined value recursively', () => {
      const myDate = new Date();

      const dataIN = {
        someString: 'world',
        someNumber: 123,
        someBoolean: true,
        someArray: [1, 2, 3],
        someEmptyObject: {},
        someDate: myDate,
        falsey1: 0,
        falsey2: '',
        stripThis: undefined,
        nested: {
          value: 'bar',
          stripThis: undefined,
          deepNested: {
            value: 'baz',
            stripThis: undefined,
          },
        },
      };

      const dataOUT = {
        someString: 'world',
        someNumber: 123,
        someBoolean: true,
        someArray: [1, 2, 3],
        someEmptyObject: {},
        someDate: myDate,
        falsey1: 0,
        falsey2: '',
        nested: {
          value: 'bar',
          deepNested: {
            value: 'baz',
          },
        },
      };

      expect(stripUndefinedValues(dataIN)).toEqual(dataOUT);
    });
  });

  describe('getTypeLabelFromField()', () => {
    test('returns label for fields', () => {
      expect(
        getTypeLabelFromField({
          type: 'keyword',
        })
      ).toBe('Keyword');
    });

    test(`returns a label prepended with 'Other' for unrecognized fields`, () => {
      expect(
        getTypeLabelFromField({
          name: 'testField',
          // @ts-ignore
          type: 'hyperdrive',
        })
      ).toBe('Other: hyperdrive');
    });
  });
});
