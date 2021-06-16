/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldsType,
  filterFieldEntries,
  matchesExistingSubObject,
  matchesInvalidKey,
  mergeFieldsWithSource,
} from './merge_fields_with_source';
import { SignalSourceHit } from './types';
import { emptyEsResult } from './__mocks__/empty_signal_source_hit';

describe('merge_fields_with_source', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * The tests for mergeFieldsWithSource use a special table and nomenclature in the comments
   * to show the enumerations and tests for each type.
   *
   * Key for the nomenclature are:
   * ---
   * undefined means non-existent
   * p_[] means primitive key and empty array
   * p_p1 or p_p2 means primitive key and primitive value
   * p_[p1] or p_[p2] means primitive key and primitive array with a single array value
   * p[p1, ...1] or p[p2, ...2] means primitive array with 2 or more values
   * p_{}1 or p_{}2 means a primitive key with a single object
   * p_[{}1] or p_[{}2] means a primitive key with an array of exactly 1 object
   * p_[{}1, ...1] or p_[{}2, ...2] means a primitive key with 2 or more array elements
   * f_[] means a flattened object key and empty array
   * f_p1 or f_p2 means a flattened object key and a primitive value
   * f_[p1] or f_[p2] means a flattened object key and a single primitive value in an array
   * f_[p1, ...1] or f_[p2, ...2] means a flattened object key and 2 or more primitive values in an array
   * f_{}1 or f_{}2 means a flattened object key with 1 object
   * f_[{}1] or f_[{}2] means a flattened object key with a single object in a single array
   * f_[{}1, ...1] or f_[{}2, ...2] means a flattened object key with 2 or more objects in an array
   *
   * _source documents can contain the following values:
   * ---
   * undefined
   * p_[]
   * p_p1
   * p_[p1]
   * p_[p1, ...1]
   * p_{}1
   * p_[{}1]
   *  p_[{}1, ...1]
   * f_[]
   * f_p1
   * f_[p1]
   * f_[p1, ...1]
   * f_{}1
   * f_[{}1]
   * f_[{}1, ...1]
   *
   * fields arrays can contain the following values:
   * -----
   * undefined
   * f_[]
   * f_[p2]
   * f_[p2, ...2]
   * f_[{}2]
   * f_[{}2, ...2]
   *
   * NOTES:
   * ----
   * When fields is undefined or empty array f_[] you never overwrite
   * the source and source is always the same as before the merge
   *
   * source        | fields        | value after merge
   * -----         | ---------     | -----
   * undefined     | undefined     | undefined
   * undefined     | f_[]          | undefined
   * p_[]          | undefined     | p_[]
   * p_[]          | f_[]          | p_[]
   * p_p1          | undefined     | p_p1
   * p_p1          | f_[]          | p_p1
   * p_[p1]        | undefined     | p_[p1]
   * p_[p1]        | f_[]          | p_[p1]
   * p_[p1, ...1]  | undefined     | p_[p1, ...1]
   * p_[p1, ...1]  | f_[]          | p_[p1, ...1]
   * p_{}1         | undefined     | p_{}1
   * p_{}1         | f_[]          | p_{}1
   * p_[{}1]       | undefined     | p_{}1
   * p_[{}1]       | f_[]          | p_{}1
   * p_[{}1, ...1] | undefined     | p_[{}1, ...1]
   * p_[{}1, ...1] | f_[]          | p_[{}1, ...1]
   * f_[]          | undefined     | f_[]
   * f_[]          | f_[]          | f_[]
   * f_p1          | undefined     | f_p1
   * f_p1          | f_[]          | f_p1
   * f_[p1]        | undefined     | f_[p1]
   * f_[p1]        | f_[]          | f_[p1]
   * f_[p1, ...1]  | undefined     | f_[p1, ...1]
   * f_[p1, ...1]  | f_[]          | f_[p1, ...1]
   * f_{}1         | undefined     | f_{}1
   * f_{}1         | f_[]          | f_{}1
   * f_[{}1]       | undefined     | f_{}1
   * f_[{}1]       | f_[]          | f_{}1
   * f_[{}1, ...1] | undefined     | f_[{}1, ...1]
   * f_[{}1, ...1] | f_[]          | f_[{}1, ...1]
   *
   *
   * When source key and source value does not exist but field keys and values do exist, then you
   * you will always get field keys and values replacing the source key and value. Caveat is that
   * fields will create a single item rather than an array item if field keys and value only has a single
   * array element. Also, we prefer to create an object structure in source (e.x. p_p2 instead of a flattened object f_p2)
   *
   * source        | fields        | value after merge
   * -----         | ---------     | -----
   * undefined     | f_[p2]        | p_p2         <-- Unboxed from array
   * undefined     | f_[p2, ...2]  | p_[p2, ...2]
   * undefined     | f_[{}2]       | p_{}2        <-- Unboxed from array
   * undefined     | f_[{}2, ...2] | p_[{}2, ...2]
   *
   * When source key is either a primitive key or a flattened object key with a primitive value (p_p1 or f_p1),
   * then we overwrite source value with fields value as an unboxed value array if fields value is a
   * single array element (f_[p2] or f[{}2]), otherwise we overwrite source as an array.
   *
   * source        | fields        | value after merge
   * -----         | ---------     | -----
   * p_p1          | f_[p2]        | p_p2          <-- Unboxed from array
   * p_p1          | f_[p2, ...2]  | p_[p2, ...2]
   * p_p1          | f_[{}2]       | p_{}2         <-- Unboxed from array
   * p_p1          | f_[{}2, ...2] | p_[{}2, ...2]
   *
   * f_p1          | f_[p2]        | f_p2          <-- Unboxed from array
   * f_p1          | f_[p2, ...2]  | f_[p2, ...2]
   * f_p1          | f_[{}2]       | f_{}2         <-- Unboxed from array
   * f_p1          | f_[{}2, ...2] | f_[{}2, ...2]
   *
   * When source key is a primitive key or a flattened object key and the source value is any
   * type of array (p_[], p_p[p1], or p_p[p1, ...1]) of primitivies then we always copy the
   * fields value as is and keep the source key as it was originally (primitive or flattened)
   *
   * source        | fields        | value after merge
   * -----         | ---------     | -----
   * p_[]          | f_[p2]        | p_[p2]
   * p_[]          | f_[p2, ...2]  | p_[p2, ...2]
   * p_[]          | f_[{}2]       | p_[{}2]
   * p_[]          | f_[{}2, ...2] | p_[{}2, ...2]
   *
   * f_[]          | f_[p2]        | f_[p2]
   * f_[]          | f_[p2, ...2]  | f_[p2, ...2]
   * f_[]          | f_[{}2]       | f_[{}2]
   * f_[]          | f_[{}2, ...2] | f_[{}2, ...2]
   *
   * p_[p1]        | f_[p2]        | p_[p2]
   * p_[p1]        | f_[p2, ...2]  | p_[p2, ...2]
   * p_[p1]        | f_[{}2]       | p_[{}2]
   * p_[p1]        | f_[{}2, ...2] | p_[{}2, ...2]
   *
   * f_[p1]        | f_[p2]        | f_[p2]
   * f_[p1]        | f_[p2, ...2]  | f_[p2, ...2]
   * f_[p1]        | f_[{}2]       | f_{}2
   * f_[p1]        | f_[{}2, ...2] | f_[{}2, ...2]
   *
   * p_[p1, ...1]  | f_[p2]        | p_[p2]
   * p_[p1, ...1]  | f_[p2, ...2]  | p_[p2, ...2]
   * p_[p1, ...1]  | f_[{}2]       | p_[{}2]
   * p_[p1, ...1]  | f_[{}2, ...2] | p_[{}2, ...2]
   *
   * f_[p1, ...1]  | f_[p2]        | f_[p2]
   * f_[p1, ...1]  | f_[p2, ...2]  | f_[p2, ...2]
   * f_[p1, ...1]  | f_[{}2]       | f_[{}2]
   * f_[p1, ...1]  | f_[{}2, ...2] | f_[{}2, ...2]
   *
   * When source key is a primitive key or flattened key and the source value is an object (p_{}1, f_{}1) or
   * an array containing objects ([p_{1}], f_{}1, p_[{}1, ...1], f_[{}1, ...1]), we only copy the
   * field value if we detect that field value is also an object meaning that it is a nested field,
   * (f_[{}]2 or f[{}2, ...2]). We never allow a field to convert an object back into a value.
   * We never try to merge field values into the array either since they're flattened in the fields and we
   * will have too many ambiguities and issues between the flattened array values and the source objects.

   * source        | fields        | value after merge
   * -----         | ---------     | -----
   * p_{}1         | f_[p2]        | p_{}1
   * p_{}1         | f_[p2, ...2]  | p_{}1
   * p_{}1         | f_[{}2]       | p_{}2         <-- Copied and unboxed array since we detected a nested field
   * p_{}1         | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field
   *
   * f_{}1         | f_[p2]        | f_{}1
   * f_{}1         | f_[p2, ...2]  | f_{}1
   * f_{}1         | f_[{}2]       | f_{}2         <-- Copied and unboxed array since we detected a nested field
   * f_{}1         | f_[{}2, ...2] | f_[{}2, ...2] <-- Copied since we detected a nested field
   *
   * p_[{}1]       | f_[p2]        | p_[{}1]
   * p_[{}1]       | f_[p2, ...2]  | p_[{}1]
   * p_[{}1]       | f_[{}2]       | p_[{}2]       <-- Copied since we detected a nested field
   * p_[{}1]       | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field
   *
   * f_[{}1]       | f_[p2]        | f_[{}1]
   * f_[{}1]       | f_[p2, ...2]  | f_[{}1]
   * f_[{}1]       | f_[{}2]       | f_[{}2]       <-- Copied since we detected a nested field
   * f_[{}1]       | f_[{}2, ...2] | f_[{}2, ...2] <-- Copied since we detected a nested field
   *
   * p_[{}1, ...1] | f_[p2]        | p_[{}1, ...1]
   * p_[{}1, ...1] | f_[p2, ...2]  | p_[{}1, ...1]
   * p_[{}1, ...1] | f_[{}2]       | p_[{}2]       <-- Copied since we detected a nested field
   * p_[{}1, ...1] | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field
   *
   * f_[{}1, ...1] | f_[p2]        | f_[{}1, ...1]
   * f_[{}1, ...1] | f_[p2, ...2]  | f_[{}1, ...1]
   * f_[{}1, ...1] | f_[{}2]       | f_[{}2]       <-- Copied since we detected a nested field
   * f_[{}1, ...1] | f_[{}2, ...2] | f_[{}2, ...2] <-- Copied since we detected a nested field
   */
  describe('mergeFieldsWithSource', () => {
    /**
     * Get the return type of the mergeFieldsWithSource for TypeScript checks against expected
     */
    type ReturnTypeMergeFieldsWithSource = ReturnType<typeof mergeFieldsWithSource>;

    describe('fields is "undefined"', () => {
      /**
       * source        | fields     | value after merge
       * -----         | ---------  | -----
       * undefined     | undefined  | undefined
       * p_[]          | undefined  | p_[]
       * p_p1          | undefined  | p_p1
       * p_[p1]        | undefined  | p_[p1]
       * p_[p1, ...1]  | undefined  | p_[p1, ...1]
       * p_{}1         | undefined  | p_{}1
       * p_[{}1]       | undefined  | p_{}1
       * p_[{}1, ...1] | undefined  | p_[{}1, ...1]
       */
      describe('primitive keys in the _source document', () => {
        /** fields is "undefined" for all tests below */
        const fields: SignalSourceHit['fields'] = {};

        test('when source is "undefined", merged doc is "undefined"', () => {
          const _source: SignalSourceHit['_source'] = {};
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an empty array (p_[]), merged doc is empty array (p_[])"', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a primitive (p_p1), merged doc is primitive (p_p1)', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: 'value',
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with a single primitive (p_[p1]), merged doc is primitive (p_[p1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: ['value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with 2 or more primitives (p_[p1, ..1]), merged doc is primitive (p_[p1, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: ['value_1', 'value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a single object (p_{}), merged doc is single object (p_{})', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: 'some value' },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with single object (p_[{}1]), merged doc is single object (p_[{}1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [{ bar: 'some value' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array of 1 or more objects (p_[{}, ...1]), merged doc is the same (p_[{}, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [{ bar: 'some value' }, { foo: 'some other value' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });
      });

      /**
       * source        | fields     | value after merge
       * -----         | ---------  | -----
       * undefined     | undefined  | undefined
       * f_[]          | undefined  | f_[]
       * f_p1          | undefined  | f_p1
       * f_[p1]        | undefined  | f_[p1]
       * f_[p1, ...1]  | undefined  | f_[p1, ...1]
       * f_{}1         | undefined  | f_{}1
       * f_[{}1]       | undefined  | f_{}1
       * f_[{}1, ...1] | undefined  | f_[{}1, ...1]
       */
      describe('flattened object keys in the _source document', () => {
        /** fields is "undefined" for all tests below */
        const fields: SignalSourceHit['fields'] = {};

        test('when source is an empty array (f_[]), merged doc is empty array (f_[])"', () => {
          const _source: SignalSourceHit['_source'] = {
            'foo.bar': [],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a primitive (f_p1), merged doc is primitive (f_p1)', () => {
          const _source: SignalSourceHit['_source'] = {
            'foo.bar': 'value',
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with a single primitive (f_[p1]), merged doc is primitive (f_[p1])', () => {
          const _source: SignalSourceHit['_source'] = {
            'foo.bar': ['value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with 2 or more primitives (f_[p1, ...1]), merged doc is primitive (f_[p1, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            'foo.bar': ['value_1', 'value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a single object (f_{}1), merged doc is single object (f_{}1)', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: 'some value' },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with single object ([f_{}1]), merged doc is single object ([f_{}1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [{ bar: 'some value' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array of 1 or more objects (f_[{}1, ...1]), merged doc is the same (f_[{}1, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [{ bar: 'some value' }, { foo: 'some other value' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });
      });
    });

    describe('fields is "[]"', () => {
      /**
       * source        | fields     | value after merge
       * -----         | ---------  | -----
       * undefined     | f_[]       | undefined
       * p_[]          | f_[]       | p_[]
       * p_p1          | f_[]       | p_p1
       * p_[p1]        | f_[]       | p_[p1]
       * p_[p1, ...1]  | f_[]       | p_[p1, ...1]
       * p_{}1         | f_[]       | p_{}1
       * p_[{}1]       | f_[]       | p_{}1
       * p_[{}1, ...1] | f_[]       | p_[{}1, ...1]
       */
      describe('primitive keys in the _source document', () => {
        /** fields is a flattened object key and an empty array value (p_[])  */
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [],
        };

        test('when source is an empty array (p_[]), merged doc is empty array (p_[])"', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: [] },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a primitive (p_p1), merged doc is primitive (p_p1)', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: 'value' },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with a single primitive (p_[p1]), merged doc is primitive (p_[p1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: ['value'] },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with 2 or more primitives (p_[p1, ..1]), merged doc is primitive (p_[p1, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: ['value_1', 'value_2'] },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a single object (p_{}), merged doc is single object (p_{})', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: { mars: 'some value' } },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with single object (p_[{}1]), merged doc is single object (p_[{}1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: [{ mars: 'some value' }] },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array of 1 or more objects (p_[{}, ...1]), merged doc is the same (p_[{}, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: [{ mars: 'some value' }, { mars: 'some other value' }] },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });
      });

      /**
       * source        | fields     | value after merge
       * -----         | ---------  | -----
       * undefined     | f_[]       | undefined
       * f_[]          | f_[]       | f_[]
       * f_p1          | f_[]       | f_p1
       * f_[p1]        | f_[]       | f_[p1]
       * f_[p1, ...1]  | f_[]       | f_[p1, ...1]
       * f_{}1         | f_[]       | f_{}1
       * f_[{}1]       | f_[]       | f_{}1
       * f_[{}1, ...1] | f_[]       | f_[{}1, ...1]
       */
      describe('flattened object keys in the _source document', () => {
        /** fields is flattened object key with an empty array for a value (f_[]) */
        const fields: SignalSourceHit['fields'] = {
          'bar.foo': [],
        };

        test('when source is an empty array (f_[]), merged doc is empty array (f_[])"', () => {
          const _source: SignalSourceHit['_source'] = {
            'bar.foo': [],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a primitive (f_p1), merged doc is primitive (f_p1)', () => {
          const _source: SignalSourceHit['_source'] = {
            'bar.foo': 'value',
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with a single primitive (f_[p1]), merged doc is primitive (f_[p1])', () => {
          const _source: SignalSourceHit['_source'] = {
            'bar.foo': ['value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with 2 or more primitives (f_[p1, ...1]), merged doc is primitive (f_[p1, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            'bar.foo': ['value_1', 'value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is a single object (f_{}1), merged doc is single object (f_{}1)', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: { bar: 'some value' },
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array with single object ([f_{}1]), merged doc is single object ([f_{}1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [{ bar: 'some value' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('when source is an array of 1 or more objects (f_[{}1, ...1]), merged doc is the same (f_[{}1, ...1])', () => {
          const _source: SignalSourceHit['_source'] = {
            foo: [{ bar: 'some value' }, { foo: 'some other value' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });
      });
    });

    /**
     * source     | fields        | value after merge
     * -----      | ---------     | -----
     * undefined  | f_[p2]        | p_p2         <-- Unboxed from array
     * undefined  | f_[p2, ...2]  | p_[p2, ...2]
     * undefined  | f_[{}2]       | p_{}2        <-- Unboxed from array
     * undefined  | f_[{}2, ...2] | p_[{}2, ...2]
     */
    describe('source is "undefined"', () => {
      /** _source is "undefined" for all tests below */
      const _source: SignalSourceHit['_source'] = {};

      test('fields is a single primitive value (f_[p2]), merged doc is an unboxed array element p_p2"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: {
            bar: 'other_value_1',
          },
        });
      });

      test('fields is a multiple primitive values (f_[p2, ...2]), merged doc is the array (f_[p2, ...2])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: {
            bar: ['other_value_1', 'other_value_2'],
          },
        });
      });

      test('fields is a single nested field value (f_[{}2]), merged doc is the unboxed array element (p_{}2)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: { bar: { zed: 'other_value_1' } },
        });
      });

      test('fields is multiple nested field values (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: { bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }] },
        });
      });
    });

    describe('source is either primitive or flattened keys, with primitive values', () => {
      /**
       * source  | fields        | value after merge
       * -----   | ---------     | -----
       * p_p1    | f_[p2]        | p_p2          <-- Unboxed from array
       * p_p1    | f_[p2, ...2]  | p_[p2, ...2]
       * p_p1    | f_[{}2]       | p_{}2         <-- Unboxed from array
       * p_p1    | f_[{}2, ...2] | p_[{}2, ...2]
       */
      describe('primitive keys in the _source document with the value of "value" (p_p1)', () => {
        /** _source is a single primitive key with a primitive value for all tests below (p_p1) */
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: 'value' },
        };

        test('fields is single array primitive value (f_[p2]), merged doc is unboxed primitive key and value (p_p2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: {
              bar: 'other_value_1',
            },
          });
        });

        test('fields has single primitive values (f_[p2, ...2]), merged doc is the array (p_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: ['other_value_1', 'other_value_2'] },
          });
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the unboxed array (p_{}2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            foo: [{ bar: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: {
              bar: 'other_value_1',
            },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            foo: [{ bar: 'other_value_1' }, { bar: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: [{ bar: 'other_value_1' }, { bar: 'other_value_2' }],
          });
        });
      });

      /**
       * source | fields        | value after merge
       * -----  | ---------     | -----
       * f_p1   | f_[p2]        | f_p2          <-- Unboxed from array
       * f_p1   | f_[p2, ...2]  | f_[p2, ...2]
       * f_p1   | f_[{}2]       | f_{}2         <-- Unboxed from array
       * f_p1   | f_[{}2, ...2] | f_[{}2, ...2]
       */
      describe('flattened object keys in the _source document (f_p1)', () => {
        /** _source is a flattened object key with a primitive value for all tests below (f_p1) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': 'value',
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is unboxed primitive key and value (f_p2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            'foo.bar': 'other_value_1',
          });
        });

        test('fields has single primitive value (f_[p2, ...2]), merged doc is the array (f_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the unboxed array (f_{}2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            'foo.bar': { zed: 'other_value_1' },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });
      });
    });

    describe('source is either primitive or flattened keys, with primitive array values', () => {
      /**
       * source | fields        | value after merge
       * -----  | ---------     | -----
       * p_[]   | f_[p2]        | p_[p2]
       * p_[]   | f_[p2, ...2]  | p_[p2, ...2]
       * p_[]   | f_[{}2]       | p_[{}2]
       * p_[]   | f_[{}2, ...2] | p_[{}2, ...2]
       */
      describe('primitive keys in the _source document with empty array (p_[])', () => {
        /** _source is a primitive key with an empty array for all tests below (p_[]) */
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: [] },
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is array value (p_[p2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: ['other_value_1'] },
          });
        });

        test('fields has single primitive values (f_[p2, ...2]), merged doc is the array (p_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: ['other_value_1', 'other_value_2'] },
          });
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array value (p_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }] },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }] },
          });
        });
      });

      /**
       * source | fields        | value after merge
       * -----  | ---------     | -----
       * f_[]   | f_[p2]        | f_[p2]
       * f_[]   | f_[p2, ...2]  | f_[p2, ...2]
       * f_[]   | f_[{}2]       | f_[{}2]
       * f_[]   | f_[{}2, ...2] | f_[{}2, ...2]
       */
      describe('flattened object keys in the _source document with empty array (f_[])', () => {
        /** _source is a flattened object key with an empty array for all tests below (f_[]) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': [],
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is array (f_[p2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple primitive values (f_[p2, ...2]), merged doc is the array (f_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array (f_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });
      });

      /**
       * source | fields        | value after merge
       * -----  | ---------     | -----
       * p_[p1] | f_[p2]        | p_[p2]
       * p_[p1] | f_[p2, ...2]  | p_[p2, ...2]
       * p_[p1] | f_[{}2]       | p_[{}2]
       * p_[p1] | f_[{}2, ...2] | p_[{}2, ...2]
       */
      describe('primitive keys in the _source document with single primitive value in an array (p_[p1])', () => {
        /** _source is a primitive key with a single primitive array value for all tests below (p_[p1]) */
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: ['value'] },
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is the array value (p_[p2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: ['other_value_1'] },
          });
        });

        test('fields has single primitive value (f_[p2, ...2]), merged doc is the array (p_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: ['other_value_1', 'other_value_2'] },
          });
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array (p_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }] },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }] },
          });
        });
      });

      /**
       * source | fields        | value after merge
       * -----  | ---------     | -----
       * f_[p1] | f_[p2]        | f_[p2]
       * f_[p1] | f_[p2, ...2]  | f_[p2, ...2]
       * f_[p1] | f_[{}2]       | f_[{}2]
       * f_[p1] | f_[{}2, ...2] | f_[{}2, ...2]
       */
      describe('flattened keys in the _source document with single flattened value in an array (f_[p1])', () => {
        /** _source is a flattened object key with a single primitive value for all tests below (f_p[p1]) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': ['value'],
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is array value (f_[p2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has single primitive value (f_[p2, ...2]), merged doc is the array (f_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array (f_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });
      });

      /**
       * source       | fields        | value after merge
       * -----        | ---------     | -----
       * p_[p1, ...1] | f_[p2]        | p_[p2]
       * p_[p1, ...1] | f_[p2, ...2]  | p_[p2, ...2]
       * p_[p1, ...1] | f_[{}2]       | p_[{}2]
       * p_[p1, ...1] | f_[{}2, ...2] | p_[{}2, ...2]
       */
      describe('primitive keys in the _source document with multiple array values in an array (p_[p1, ...1])', () => {
        /** _source is a primitive key with an array of 2 or more elements for all tests below (p_[p1, ...1]) */
        const _source: SignalSourceHit['_source'] = {
          foo: {
            bar: ['value_1', 'value_2'],
          },
        };

        test('fields is single array value (f_[p2]), merged doc is array (p_[p2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: {
              bar: ['other_value_1'],
            },
          });
        });

        test('fields is multiple primitive values (f_[p2, ...2]), merged doc is the array (p_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: {
              bar: ['other_value_1', 'other_value_2'],
            },
          });
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the unboxed value (p_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: {
              bar: [{ zed: 'other_value_1' }],
            },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: {
              bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
            },
          });
        });
      });

      /**
       * source       | fields        | value after merge
       * -----        | ---------     | -----
       * f_[p1, ...1] | f_[p2]        | f_[p2]
       * f_[p1, ...1] | f_[p2, ...2]  | f_[p2, ...2]
       * f_[p1, ...1] | f_[{}2]       | f_[{}2]
       * f_[p1, ...1] | f_[{}2, ...2] | f_[{}2, ...2]
       */
      describe('flattened keys in the _source document with multiple array values in an array (f_[p1, ...1])', () => {
        /** _source is a flattened object key with an array of 2 or more elements for all tests below (f_[p1, ...1]) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': ['value_1', 'value_2'],
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is unboxed primitive key and value (f_p2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple primitive values (f_[p2, ...2]), merged doc is the array (f_[p2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array (f_{}2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });
      });
    });

    describe('source is either primitive or flattened keys, with object values', () => {
      /**
       * source | fields        | value after merge
       * -----  | ---------     | -----
       * p_{}1  | f_[p2]        | p_{}1
       * p_{}1  | f_[p2, ...2]  | p_{}1
       * p_{}1  | f_[{}2]       | p_{}2         <-- Copied and unboxed array since we detected a nested field
       * p_{}1  | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field
       */
      describe('primitive keys in the _source document with the value of "value" (p_{}1)', () => {
        /** _source is a primitive key with an object value for all tests below (p_{}1) */
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: { mars: 'value_1' } },
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is the same source (p_{}1)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has single primitive values (f_[p2, ...2]), merged doc is the same _source (p_{}1)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the unboxed array value (p_{}2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: { zed: 'other_value_1' } },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }] },
          });
        });
      });

      /**
       * source  | fields         | value after merge
       * -----   | ---------      | -----
       * f_{}1   | f_[p2]         | f_{}1
       * f_{}1   | f_[p2, ...2]   | f_{}1
       * f_{}1   | f_[{}2]        | f_{}2         <-- Copied and unboxed array since we detected a nested field
       * f_{}1   | f_[{}2, ...2]  | f_[{}2, ...2] <-- Copied since we detected a nested field
       */
      describe('flattened object keys in the _source document with the value of "value" (f_{}1)', () => {
        /** _source is a flattened object key with an object value for all tests below (f_{}1) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': { mars: 'value_1' },
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is the same source (f_{}1)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has primitive values (f_[p2, ...2]), merged doc is the same _source (f_{}1)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is unboxed array value (f_{}2)"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ mars: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            'foo.bar': { mars: 'other_value_1' },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
          });
        });
      });
    });

    describe('source is either primitive or flattened keys, with object array values', () => {
      /**
       * source   | fields         | value after merge
       * -----    | ---------      | -----
       * p_[{}1]  | f_[p2]         | p_[{}1]
       * p_[{}1]  | f_[p2, ...2]   | p_[{}1]
       * p_[{}1]  | f_[{}2]        | p_[{}2]       <-- Copied since we detected a nested field
       * p_[{}1]  | f_[{}2, ...2]  | p_[{}2, ...2] <-- Copied since we detected a nested field
       */
      describe('primitive keys in the _source document with a single array value with an object (p_[{}1])', () => {
        /** _source is a primitive key with a single array value with an object for all tests below (p_[{}1]) */
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: [{ mars: ['value_1'] }] },
        };

        test('fields has a single primitive value (f_[p2]), merged doc is the same _source (p_[{}1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has 2 or more primitive values (f_[p2, ...2]), merged doc is the same _source (p_[{}1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array value (p_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }] },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }] },
          });
        });
      });

      /**
       * source        | fields         | value after merge
       * -----         | ---------      | -----
       * p_[{}1, ...1] | f_[p2]         | p_[{}1, ...1]
       * p_[{}1, ...1] | f_[p2, ...2]   | p_[{}1, ...1]
       * p_[{}1, ...1] | f_[{}2]        | p_[{}2]       <-- Copied since we detected a nested field
       * p_[{}1, ...1] | f_[{}2, ...2]  | p_[{}2, ...2] <-- Copied since we detected a nested field
       */
      describe('primitive keys in the _source document with multiple array objects (p_[{}1, ...1])', () => {
        /** _source is a primitive key with a 2 or more array values with an object for all tests below (p_[{}1, ...1]) */
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: [{ mars: ['value_1'] }, { mars: ['value_1'] }] },
        };

        test('fields has a single primitive value (f_[p2]), merged doc is the same _source (p_[{}1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has 2 or more primitive values (f_[p2, ...2]), merged doc is the same _source (p_[{}1, ...1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is the array value (p_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }] },
          });
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
            foo: { bar: [{ zed: 'other_value_1' }, { zed: 'other_value_2' }] },
          });
        });
      });

      /**
       * source   | fields         | value after merge
       * -----    | ---------      | -----
       * f_[{}1]  | f_[p2]         | f_[{}1]
       * f_[{}1]  | f_[p2, ...2]   | f_[{}1]
       * f_[{}1]  | f_[{}2]        | f_[{}2]       <-- Copied since we detected a nested field
       * f_[{}1]  | f_[{}2, ...2]  | f_[{}2, ...2] <-- Copied since we detected a nested field
       */
      describe('flattened object keys in the _source document with the single value of "value" (f_[{}1])', () => {
        /** _source is a flattened object key with a single array object for all tests below (f_[{}1]) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': [{ mars: 'value_1' }],
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is the same _source (f_[{}1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has primitive values (f_[p2, ...2]), merged doc is the same _source (f_[{}1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is array value (f_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ mars: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });
      });

      /**
       * source        | fields         | value after merge
       * -----         | ---------      | -----
       * f_[{}1, ...1] | f_[p2]         | f_[{}1, ...1]
       * f_[{}1, ...1] | f_[p2, ...2]   | f_[{}1, ...1]
       * f_[{}1, ...1] | f_[{}2]        | f_[{}2]       <-- Copied since we detected a nested field
       * f_[{}1, ...1] | f_[{}2, ...2]  | f_[{}2, ...2] <-- Copied since we detected a nested field
       */
      describe('flattened object keys in the _source document with multiple values of "value" (f_[{}1, ...1])', () => {
        /** _source is a flattened object key with 2 or more array objects for all tests below (f_[{}1]) */
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': [{ mars: 'value_1' }, { mars: 'value_2' }],
        };

        test('fields is flattened object key with single array value (f_[p2]), merged doc is the same _source (f_[{}1, ...1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has primitive values (f_[p2, ...2]), merged doc is the same _source (f_[{}1, ...1])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': ['other_value_1', 'other_value_2'],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
        });

        test('fields has a single nested object (f_[{}2]), merged doc is array value (f_[{}2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ mars: 'other_value_1' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });

        test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}2, ...2])"', () => {
          const fields: SignalSourceHit['fields'] = {
            'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
          };
          const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
          const merged = mergeFieldsWithSource({ doc });
          expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(fields);
        });
      });
    });

    /**
     * It is possible to have a mixture of flattened keys and primitive keys within a _source document.
     * These tests cover those cases and these test cases should be considered hopefully rare occurrences.
     * If these become more common place, update the top table with all the permutations and combinations
     * of tests for these. For now, expect the flattened object keys to get the values added to them vs.
     * the other value. These tests show the behaviors of this but also the existing bugs of what happens
     * when we merge.
     */
    describe('miscellaneous tests of mixed flattened and source objects within _source', () => {
      /** _source has a primitive key mixed with an object with the same path information which causes ambiguity */
      const _source: SignalSourceHit['_source'] = {
        foo: { bar: 'value_1' },
        'foo.bar': 'value_2',
      };

      test('fields has a single primitive value f_[p2] which is to override one of the values above"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: { bar: 'value_1' },
          'foo.bar': 'other_value_1',
        });
      });

      /**
       * This is an ambiguous situation in which we produce incorrect results.
       */
      test('fields has the same list of values as that of the original document and we actually do not understand if this is a new value or not"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['value_1', 'value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: { bar: 'value_1' }, // <--- We have duplicated value_1 twice which is a bug
          'foo.bar': ['value_1', 'value_2'], // <-- We have merged the array value because we do not understand if we should or not
        });
      });
    });

    /**
     * These tests show the behaviors around overriding fields with other fields such as objects overriding
     * values and values overriding objects.
     */
    describe('Fields overriding fields', () => {
      test('fields with two values can override an object into a keyword"', () => {
        const _source: SignalSourceHit['_source'] = {};
        const fields: SignalSourceHit['fields'] = {
          foo: ['other_value_1'],
          'foo.bar': ['other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeFieldsWithSource({ doc });
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: { bar: 'other_value_2' },
        });
      });
    });
  });

  describe('matchesExistingSubObject', () => {
    const dummyValue = ['value'];

    test('it returns true if a subObject is sent in', () => {
      expect(matchesExistingSubObject('foo', [['foo.bar', dummyValue]])).toEqual(true);
    });

    test('it returns false if the fieldsKey matches the string sent in', () => {
      expect(matchesExistingSubObject('foo', [['foo', dummyValue]])).toEqual(false);
    });

    test('it returns false if a sibling object is sent in', () => {
      expect(matchesExistingSubObject('foo.bar', [['foo.mar', dummyValue]])).toEqual(false);
    });
  });

  describe('matchesInvalidKey', () => {
    test('it returns true if a value is a single dot', () => {
      expect(matchesInvalidKey('.')).toEqual(true);
    });

    test('it returns true if a value starts with a dot', () => {
      expect(matchesInvalidKey('.invalidName')).toEqual(true);
    });

    test('it returns true if a value is 2 dots', () => {
      expect(matchesInvalidKey('..')).toEqual(true);
    });

    test('it returns true if a value is 3 dots', () => {
      expect(matchesInvalidKey('...')).toEqual(true);
    });

    test('it returns true if a value has two dots in its name', () => {
      expect(matchesInvalidKey('host..name')).toEqual(true);
    });

    test('it returns false if a value has a single dot', () => {
      expect(matchesInvalidKey('host.name')).toEqual(false);
    });

    test('it returns false if a value is a regular path', () => {
      expect(matchesInvalidKey('a.b.c.d')).toEqual(false);
    });

    /** Yes, this is a valid key in elastic */
    test('it returns false if a value ends with a dot', () => {
      expect(matchesInvalidKey('validName.')).toEqual(false);
    });
  });

  describe('filterFieldEntries', () => {
    const dummyValue = ['value'];
    /**
     * Get the return type of the mergeFieldsWithSource for TypeScript checks against expected
     */
    type ReturnTypeFilterFieldEntries = ReturnType<typeof filterFieldEntries>;

    test('returns a single valid fieldEntries as expected', () => {
      const fieldEntries: Array<[string, FieldsType]> = [['foo.bar', dummyValue]];
      expect(filterFieldEntries(fieldEntries)).toEqual<ReturnTypeFilterFieldEntries>(fieldEntries);
    });

    test('removes invalid dotted entries', () => {
      const fieldEntries: Array<[string, FieldsType]> = [
        ['.', dummyValue],
        ['foo.bar', dummyValue],
        ['..', dummyValue],
        ['foo..bar', dummyValue],
      ];
      expect(filterFieldEntries(fieldEntries)).toEqual<ReturnTypeFilterFieldEntries>([
        ['foo.bar', dummyValue],
      ]);
    });

    test('removes invalid subObjects mixed with longer values', () => {
      const fieldEntries: Array<[string, FieldsType]> = [
        ['moo', dummyValue], // <-- Invalid subObject since we have 'moo.cow.long'
        ['foo.mars', dummyValue],
        ['foo.bar', dummyValue],
        ['moo.cow.long', dummyValue],
        ['foo', dummyValue], // <-- Invalid subObject we remove
      ];
      expect(filterFieldEntries(fieldEntries)).toEqual<ReturnTypeFilterFieldEntries>([
        ['foo.mars', dummyValue],
        ['foo.bar', dummyValue],
        ['moo.cow.long', dummyValue],
      ]);
    });
  });
});
