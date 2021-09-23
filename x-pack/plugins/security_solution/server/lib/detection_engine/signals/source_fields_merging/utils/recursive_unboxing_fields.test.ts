/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTypes } from '../../../../../../common/detection_engine/types';
import { recursiveUnboxingFields } from './recursive_unboxing_fields';
import { FieldsType } from '../types';

describe('recursive_unboxing_fields', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('valueInMergedDocument is "undefined"', () => {
    const valueInMergedDocument: SearchTypes = undefined;
    test('it will return an empty array as is', () => {
      const nested: FieldsType = [];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual([]);
    });

    test('it will return an empty object as is', () => {
      const nested: FieldsType[0] = {};
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual({});
    });

    test('it will unbox a single array field', () => {
      const nested: FieldsType = ['foo_value_1'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual('foo_value_1');
    });

    test('it will not unbox an array with two fields', () => {
      const nested: FieldsType = ['foo_value_1', 'foo_value_2'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual([
        'foo_value_1',
        'foo_value_2',
      ]);
    });

    test('it will unbox a nested structure of 3 single arrays', () => {
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual({ bar: { zed: 'zed_value_1' }, foo: 'foo_value_1' });
    });

    test('it will not unbox a nested structure of 2 array values at the top most level', () => {
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual([
        { bar: { zed: 'zed_value_1' }, foo: 'foo_value_1' },
        { bar: { zed: 'zed_value_1' }, foo: 'foo_value_1' },
      ]);
    });

    test('it will not unbox a nested structure of mixed values at different levels', () => {
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
            fred: {
              yolo: ['deep_1', 'deep_2'],
            },
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual({
        bar: { fred: { yolo: ['deep_1', 'deep_2'] }, zed: 'zed_value_1' },
        foo: 'foo_value_1',
      });
    });
  });

  describe('valueInMergedDocument is an empty object', () => {
    const valueInMergedDocument: SearchTypes = {};
    test('it will return an empty array as is', () => {
      const nested: FieldsType = [];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual([]);
    });

    test('it will return an empty object as is', () => {
      const nested: FieldsType[0] = {};
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual({});
    });

    test('it will unbox a single array field', () => {
      const nested: FieldsType = ['foo_value_1'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual('foo_value_1');
    });

    test('it will not unbox an array with two fields', () => {
      const nested: FieldsType = ['foo_value_1', 'foo_value_2'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual([
        'foo_value_1',
        'foo_value_2',
      ]);
    });

    test('it will unbox a nested structure of 3 single arrays', () => {
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual({ bar: { zed: 'zed_value_1' }, foo: 'foo_value_1' });
    });

    test('it will not unbox a nested structure of 2 array values at the top most level', () => {
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual([
        { bar: { zed: 'zed_value_1' }, foo: 'foo_value_1' },
        { bar: { zed: 'zed_value_1' }, foo: 'foo_value_1' },
      ]);
    });

    test('it will not unbox a nested structure of mixed values at different levels', () => {
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
            fred: {
              yolo: ['deep_1', 'deep_2'],
            },
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual({
        bar: { fred: { yolo: ['deep_1', 'deep_2'] }, zed: 'zed_value_1' },
        foo: 'foo_value_1',
      });
    });
  });

  describe('valueInMergedDocument mirrors the nested field in different ways', () => {
    test('it will not unbox when the valueInMergedDocument is an array value', () => {
      const valueInMergedDocument: SearchTypes = ['foo_value_1'];
      const nested: FieldsType = ['foo_value_1'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual(['foo_value_1']);
    });

    test('it will not unbox when the valueInMergedDocument is an empty array value', () => {
      const valueInMergedDocument: SearchTypes = [];
      const nested: FieldsType = ['foo_value_1'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual(['foo_value_1']);
    });

    test('it will not unbox an array with two fields', () => {
      const valueInMergedDocument: SearchTypes = ['foo_value_1', 'foo_value_2'];
      const nested: FieldsType = ['foo_value_1', 'foo_value_2'];
      expect(recursiveUnboxingFields(nested, valueInMergedDocument)).toEqual([
        'foo_value_1',
        'foo_value_2',
      ]);
    });

    test('it will not unbox a nested structure of 3 single arrays when valueInMergedDocument has empty array values', () => {
      const valueInMergedDocument: SearchTypes = [
        {
          foo: [],
          bar: {
            zed: [],
          },
        },
      ];
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual([{ bar: { zed: ['zed_value_1'] }, foo: ['foo_value_1'] }]);
    });

    test('it will not unbox a nested structure of 3 single arrays when valueInMergedDocument has array values', () => {
      const valueInMergedDocument: SearchTypes = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual([{ bar: { zed: ['zed_value_1'] }, foo: ['foo_value_1'] }]);
    });

    test('it will not overwrite a nested structure of 3 single arrays when valueInMergedDocument has array values that are different', () => {
      const valueInMergedDocument: SearchTypes = [
        {
          foo: ['other_value_1'],
          bar: {
            zed: ['other_value_2'],
          },
        },
      ];
      const nested: FieldsType = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual([{ bar: { zed: ['zed_value_1'] }, foo: ['foo_value_1'] }]);
    });

    test('it will work with mixed array values between "nested" and  "valueInMergedDocument"', () => {
      const valueInMergedDocument: SearchTypes = [
        {
          foo: ['foo_value_1'],
          bar: {
            zed: ['zed_value_1'],
          },
        },
      ];
      const nested: FieldsType = [
        {
          foo: ['foo_value_1', 'foo_value_2', 'foo_value_3'],
          bar: {
            zed: ['zed_value_1', 'zed_value_1', 'zed_value_2'],
          },
        },
      ];
      const recursed = recursiveUnboxingFields(nested, valueInMergedDocument);
      expect(recursed).toEqual([
        {
          bar: { zed: ['zed_value_1', 'zed_value_1', 'zed_value_2'] },
          foo: ['foo_value_1', 'foo_value_2', 'foo_value_3'],
        },
      ]);
    });
  });
});
