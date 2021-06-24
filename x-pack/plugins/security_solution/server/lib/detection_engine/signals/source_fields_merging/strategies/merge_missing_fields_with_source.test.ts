/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMissingFieldsWithSource } from './merge_missing_fields_with_source';
import { SignalSourceHit } from '../../types';
import { emptyEsResult } from '../../__mocks__/empty_signal_source_hit';

/**
 * See ../README.md for the nomenclature of any notes within tests below
 */
describe('merge_missing_fields_with_source', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /** Get the return type of the mergeMissingFieldsWithSource for TypeScript checks against expected */
  type ReturnTypeMergeFieldsWithSource = ReturnType<typeof mergeMissingFieldsWithSource>['_source'];

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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an empty array (p_[]), merged doc is empty array (p_[])"', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a primitive (p_p1), merged doc is primitive (p_p1)', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: 'value',
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with a single primitive (p_[p1]), merged doc is primitive (p_[p1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: ['value'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with 2 or more primitives (p_[p1, ..1]), merged doc is primitive (p_[p1, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: ['value_1', 'value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a single object (p_{}), merged doc is single object (p_{})', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: 'some value' },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with single object (p_[{}1]), merged doc is single object (p_[{}1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [{ bar: 'some value' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array of 1 or more objects (p_[{}, ...1]), merged doc is the same (p_[{}, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [{ bar: 'some value' }, { foo: 'some other value' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a primitive (f_p1), merged doc is primitive (f_p1)', () => {
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': 'value',
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with a single primitive (f_[p1]), merged doc is primitive (f_[p1])', () => {
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': ['value'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with 2 or more primitives (f_[p1, ...1]), merged doc is primitive (f_[p1, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          'foo.bar': ['value_1', 'value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a single object (f_{}1), merged doc is single object (f_{}1)', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: 'some value' },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with single object ([f_{}1]), merged doc is single object ([f_{}1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [{ bar: 'some value' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array of 1 or more objects (f_[{}1, ...1]), merged doc is the same (f_[{}1, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [{ bar: 'some value' }, { foo: 'some other value' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a primitive (p_p1), merged doc is primitive (p_p1)', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: 'value' },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with a single primitive (p_[p1]), merged doc is primitive (p_[p1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: ['value'] },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with 2 or more primitives (p_[p1, ..1]), merged doc is primitive (p_[p1, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: ['value_1', 'value_2'] },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a single object (p_{}), merged doc is single object (p_{})', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: { mars: 'some value' } },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with single object (p_[{}1]), merged doc is single object (p_[{}1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: [{ mars: 'some value' }] },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array of 1 or more objects (p_[{}, ...1]), merged doc is the same (p_[{}, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: [{ mars: 'some value' }, { mars: 'some other value' }] },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a primitive (f_p1), merged doc is primitive (f_p1)', () => {
        const _source: SignalSourceHit['_source'] = {
          'bar.foo': 'value',
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with a single primitive (f_[p1]), merged doc is primitive (f_[p1])', () => {
        const _source: SignalSourceHit['_source'] = {
          'bar.foo': ['value'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with 2 or more primitives (f_[p1, ...1]), merged doc is primitive (f_[p1, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          'bar.foo': ['value_1', 'value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is a single object (f_{}1), merged doc is single object (f_{}1)', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: { bar: 'some value' },
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array with single object ([f_{}1]), merged doc is single object ([f_{}1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [{ bar: 'some value' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('when source is an array of 1 or more objects (f_[{}1, ...1]), merged doc is the same (f_[{}1, ...1])', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: [{ bar: 'some value' }, { foo: 'some other value' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });
  });

  /**
   * source     | fields        | value after merge
   * -----      | ---------     | -----
   * undefined  | f_[p2]        | p_p2         <-- Unboxed from array
   * undefined  | f_[p2, ...2]  | p_[p2, ...2]
   * undefined  | f_[{}2]       | {}           <-- We have an empty object since we only merge primitives
   * undefined  | f_[{}2, ...2] | {}           <-- We have an empty object since we only merge primitives
   */
  describe('source is "undefined"', () => {
    /** _source is "undefined" for all tests below */
    const _source: SignalSourceHit['_source'] = {};

    test('fields is a single primitive value (f_[p2]), merged doc is an unboxed array element p_p2"', () => {
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': ['other_value_1'],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
        foo: {
          bar: 'other_value_1',
        },
      });
    });

    test('fields is a multiple primitive values (f_[p2, ...2]), merged doc is the array (p_[p2, ...2])"', () => {
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': ['other_value_1', 'other_value_2'],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
        foo: {
          bar: ['other_value_1', 'other_value_2'],
        },
      });
    });

    test('fields is a single nested field value (f_[{}2]), merged doc is empty object ({})"', () => {
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': [{ zed: 'other_value_1' }],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({});
    });

    test('fields is multiple nested field values (f_[{}2, ...2]), merged doc is the empty object ({})"', () => {
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({});
    });
  });

  describe('source is either primitive or flattened keys, with primitive values', () => {
    /**
     * source  | fields        | value after merge
     * -----   | ---------     | -----
     * p_p1    | f_[p2]        | p_p1
     * p_p1    | f_[p2, ...2]  | p_p1
     * p_p1    | f_[{}2]       | p_p1
     * p_p1    | f_[{}2, ...2] | p_p1
     */
    describe('primitive keys in the _source document with the value of "value" (p_p1)', () => {
      /** _source is a single primitive key with a primitive value for all tests below (p_p1) */
      const _source: SignalSourceHit['_source'] = {
        foo: { bar: 'value' },
      };

      test('fields is single array primitive value (f_[p2]), merged doc is unboxed primitive key and value (p_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has single primitive values (f_[p2, ...2]), merged doc is the array (p_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the unboxed array (p_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          foo: [{ bar: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          foo: [{ bar: 'other_value_1' }, { bar: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source | fields        | value after merge
     * -----  | ---------     | -----
     * f_p1   | f_[p2]        | f_p1
     * f_p1   | f_[p2, ...2]  | f_p1
     * f_p1   | f_[{}2]       | f_p1
     * f_p1   | f_[{}2, ...2] | f_p1
     */
    describe('flattened object keys in the _source document (f_p1)', () => {
      /** _source is a flattened object key with a primitive value for all tests below (f_p1) */
      const _source: SignalSourceHit['_source'] = {
        'foo.bar': 'value',
      };

      test('fields is flattened object key with single array value (f_[p2]), merged doc is unboxed primitive key and value (f_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has single primitive value (f_[p2, ...2]), merged doc is the array (f_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the unboxed array (f_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_p1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });
  });

  describe('source is either primitive or flattened keys, with primitive array values', () => {
    /**
     * source | fields        | value after merge
     * -----  | ---------     | -----
     * p_[]   | f_[p2]        | p_[]
     * p_[]   | f_[p2, ...2]  | p_[]
     * p_[]   | f_[{}2]       | p_[]
     * p_[]   | f_[{}2, ...2] | p_[]
     */
    describe('primitive keys in the _source document with empty array (p_[])', () => {
      /** _source is a primitive key with an empty array for all tests below (p_[]) */
      const _source: SignalSourceHit['_source'] = {
        foo: { bar: [] },
      };

      test('fields is flattened object key with single array value (f_[p2]), merged doc is array value (p_[]])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has single primitive values (f_[p2, ...2]), merged doc is the array (p_[])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array value (p_[])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source | fields        | value after merge
     * -----  | ---------     | -----
     * f_[]   | f_[p2]        | f_[]
     * f_[]   | f_[p2, ...2]  | f_[]
     * f_[]   | f_[{}2]       | f_[]
     * f_[]   | f_[{}2, ...2] | f_[]
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple primitive values (f_[p2, ...2]), merged doc is the array (f_[])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array (f_[])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source | fields        | value after merge
     * -----  | ---------     | -----
     * p_[p1] | f_[p2]        | p_[p1]
     * p_[p1] | f_[p2, ...2]  | p_[p1]
     * p_[p1] | f_[{}2]       | p_[p1]
     * p_[p1] | f_[{}2, ...2] | p_[p1]
     */
    describe('primitive keys in the _source document with single primitive value in an array (p_[p1])', () => {
      /** _source is a primitive key with a single primitive array value for all tests below (p_[p1]) */
      const _source: SignalSourceHit['_source'] = {
        foo: { bar: ['value'] },
      };

      test('fields is flattened object key with single array value (f_[p2]), merged doc is the array value (p_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has single primitive value (f_[p2, ...2]), merged doc is the array (p_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array (p_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source | fields        | value after merge
     * -----  | ---------     | -----
     * f_[p1] | f_[p2]        | f_[p1]
     * f_[p1] | f_[p2, ...2]  | f_[p1]
     * f_[p1] | f_[{}2]       | f_[p1]
     * f_[p1] | f_[{}2, ...2] | f_[p1]
     */
    describe('flattened keys in the _source document with single flattened value in an array (f_[p1])', () => {
      /** _source is a flattened object key with a single primitive value for all tests below (f_p[p1]) */
      const _source: SignalSourceHit['_source'] = {
        'foo.bar': ['value'],
      };

      test('fields is flattened object key with single array value (f_[p2]), merged doc is array value (f_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has single primitive value (f_[p2, ...2]), merged doc is the array (f_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array (f_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[p1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source       | fields        | value after merge
     * -----        | ---------     | -----
     * p_[p1, ...1] | f_[p2]        | p_[p1, ...1]
     * p_[p1, ...1] | f_[p2, ...2]  | p_[p1, ...1]
     * p_[p1, ...1] | f_[{}2]       | p_[p1, ...1]
     * p_[p1, ...1] | f_[{}2, ...2] | p_[p1, ...1]
     */
    describe('primitive keys in the _source document with multiple array values in an array (p_[p1, ...1])', () => {
      /** _source is a primitive key with an array of 2 or more elements for all tests below (p_[p1, ...1]) */
      const _source: SignalSourceHit['_source'] = {
        foo: {
          bar: ['value_1', 'value_2'],
        },
      };

      test('fields is single array value (f_[p2]), merged doc is array (p_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields is multiple primitive values (f_[p2, ...2]), merged doc is the array (p_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the unboxed value (p_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source       | fields        | value after merge
     * -----        | ---------     | -----
     * f_[p1, ...1] | f_[p2]        | f_[p1, ...1]
     * f_[p1, ...1] | f_[p2, ...2]  | f_[p1, ...1]
     * f_[p1, ...1] | f_[{}2]       | f_[p1, ...1]
     * f_[p1, ...1] | f_[{}2, ...2] | f_[p1, ...1]
     */
    describe('flattened keys in the _source document with multiple array values in an array (f_[p1, ...1])', () => {
      /** _source is a flattened object key with an array of 2 or more elements for all tests below (f_[p1, ...1]) */
      const _source: SignalSourceHit['_source'] = {
        'foo.bar': ['value_1', 'value_2'],
      };

      test('fields is flattened object key with single array value (f_[p2]), merged doc is unboxed primitive key and value (f_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple primitive values (f_[p2, ...2]), merged doc is the array (f_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array (f_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[p1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });
  });

  describe('source is either primitive or flattened keys, with object values', () => {
    /**
     * source | fields        | value after merge
     * -----  | ---------     | -----
     * p_{}1  | f_[p2]        | p_{}1
     * p_{}1  | f_[p2, ...2]  | p_{}1
     * p_{}1  | f_[{}2]       | p_{}1
     * p_{}1  | f_[{}2, ...2] | p_{}1
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has single primitive values (f_[p2, ...2]), merged doc is the same _source (p_{}1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the unboxed array value (p_{}1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_{}1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source  | fields         | value after merge
     * -----   | ---------      | -----
     * f_{}1   | f_[p2]         | f_{}1
     * f_{}1   | f_[p2, ...2]   | f_{}1
     * f_{}1   | f_[{}2]        | f_{}1
     * f_{}1   | f_[{}2, ...2]  | f_{}1
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has primitive values (f_[p2, ...2]), merged doc is the same _source (f_{}1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is unboxed array value (f_{}1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ mars: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_{}1)"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });
  });

  describe('source is either primitive or flattened keys, with object array values', () => {
    /**
     * source   | fields         | value after merge
     * -----    | ---------      | -----
     * p_[{}1]  | f_[p2]         | p_[{}1]
     * p_[{}1]  | f_[p2, ...2]   | p_[{}1]
     * p_[{}1]  | f_[{}2]        | p_[{}1]
     * p_[{}1]  | f_[{}2, ...2]  | p_[{}1]
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has 2 or more primitive values (f_[p2, ...2]), merged doc is the same _source (p_[{}1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array value (p_[{}1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source        | fields         | value after merge
     * -----         | ---------      | -----
     * p_[{}1, ...1] | f_[p2]         | p_[{}1, ...1]
     * p_[{}1, ...1] | f_[p2, ...2]   | p_[{}1, ...1]
     * p_[{}1, ...1] | f_[{}2]        | p_[{}1, ...1]
     * p_[{}1, ...1] | f_[{}2, ...2]  | p_[{}1, ...1]
     */
    describe('primitive keys in the _source document with multiple array objects (p_[{}1, ...1])', () => {
      /** _source is a primitive key with a 2 or more array values with an object for all tests below (p_[{}1, ...1]) */
      const _source: SignalSourceHit['_source'] = {
        foo: { bar: [{ mars: ['value_1'] }, { mars: ['value_1'] }] },
      };

      test('fields has a single primitive value (f_[p2]), merged doc is the same _source (p_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has 2 or more primitive values (f_[p2, ...2]), merged doc is the same _source (p_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is the array value (p_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (p_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ zed: 'other_value_1' }, { zed: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source   | fields         | value after merge
     * -----    | ---------      | -----
     * f_[{}1]  | f_[p2]         | f_[{}1]
     * f_[{}1]  | f_[p2, ...2]   | f_[{}1]
     * f_[{}1]  | f_[{}2]        | f_[{}1]
     * f_[{}1]  | f_[{}2, ...2]  | f_[{}1]
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has primitive values (f_[p2, ...2]), merged doc is the same _source (f_[{}1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is array value (f_[{}1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ mars: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });
    });

    /**
     * source        | fields         | value after merge
     * -----         | ---------      | -----
     * f_[{}1, ...1] | f_[p2]         | f_[{}1, ...1]
     * f_[{}1, ...1] | f_[p2, ...2]   | f_[{}1, ...1]
     * f_[{}1, ...1] | f_[{}2]        | f_[{}1, ...1]
     * f_[{}1, ...1] | f_[{}2, ...2]  | f_[{}1, ...1]
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
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has primitive values (f_[p2, ...2]), merged doc is the same _source (f_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': ['other_value_1', 'other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has a single nested object (f_[{}2]), merged doc is array value (f_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ mars: 'other_value_1' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('fields has multiple nested objects (f_[{}2, ...2]), merged doc is the array (f_[{}1, ...1])"', () => {
        const fields: SignalSourceHit['fields'] = {
          'foo.bar': [{ mars: 'other_value_1' }, { mars: 'other_value_2' }],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
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

    test('fields has a single primitive value f_[p2] which is not overridden"', () => {
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': ['other_value_1'],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
    });

    /**
     * This is an ambiguous situation in which we produce correct results since _source is defined.
     */
    test('fields has the same list of values as that of the original document"', () => {
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': ['value_1', 'value_2'],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
    });
  });

  /**
   * These tests show the behaviors around overriding fields with other fields such as objects overriding
   * values and values overriding objects. This occurs with multi fields where you can have "foo" and "foo.keyword"
   * in the fields
   */
  describe('Fields overriding fields', () => {
    describe('primitive keys for the _source', () => {
      test('DOES NOT remove multi-field values such "foo.keyword" mixed with "foo" and prefers just "foo" for 1st level', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: 'foo_value_1',
          bar: 'bar_value_1',
        };
        const fields: SignalSourceHit['fields'] = {
          foo: ['foo_other_value_1'],
          'foo.keyword': ['foo_other_value_keyword_1'],
          bar: ['bar_other_value_1'],
          'bar.keyword': ['bar_other_value_keyword_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('DOES NOT remove multi-field values such "host.name.keyword" mixed with "host.name" and prefers just "host.name" for 2nd level', () => {
        const _source: SignalSourceHit['_source'] = {
          host: {
            name: 'host_value_1',
            hostname: 'host_name_value_1',
          },
        };
        const fields: SignalSourceHit['fields'] = {
          'host.name': ['host_name_other_value_1'],
          'host.name.keyword': ['host_name_other_value_keyword_1'],
          'host.hostname': ['hostname_other_value_1'],
          'host.hostname.keyword': ['hostname_other_value_keyword_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('DOES NOT remove multi-field values such "foo.host.name.keyword" mixed with "foo.host.name" and prefers just "foo.host.name" for 3rd level', () => {
        const _source: SignalSourceHit['_source'] = {
          foo: {
            host: {
              name: 'host_value_1',
              hostname: 'host_name_value_1',
            },
          },
        };
        const fields: SignalSourceHit['fields'] = {
          'foo.host.name': ['host_name_other_value_1'],
          'foo.host.name.keyword': ['host_name_other_value_keyword_1'],
          'foo.host.hostname': ['hostname_other_value_1'],
          'foo.host.hostname.keyword': ['hostname_other_value_keyword_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('multi-field values mixed with regular values will not be merged accidentally"', () => {
        const _source: SignalSourceHit['_source'] = {};
        const fields: SignalSourceHit['fields'] = {
          foo: ['other_value_1'],
          'foo.bar': ['other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: 'other_value_1',
        });
      });
    });

    describe('flattened keys for the _source', () => {
      test('DOES NOT remove multi-field values such "host.name.keyword" mixed with "host.name" and prefers just "host.name" for 2nd level', () => {
        const _source: SignalSourceHit['_source'] = {
          'host.name': 'host_value_1',
          'host.hostname': 'host_name_value_1',
        };
        const fields: SignalSourceHit['fields'] = {
          'host.name': ['host_name_other_value_1'],
          'host.name.keyword': ['host_name_other_value_keyword_1'],
          'host.hostname': ['hostname_other_value_1'],
          'host.hostname.keyword': ['hostname_other_value_keyword_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('DOES NOT remove multi-field values such "foo.host.name.keyword" mixed with "foo.host.name" and prefers just "foo.host.name" for 3rd level', () => {
        const _source: SignalSourceHit['_source'] = {
          'foo.host.name': 'host_value_1',
          'foo.host.hostname': 'host_name_value_1',
        };
        const fields: SignalSourceHit['fields'] = {
          'foo.host.name': ['host_name_other_value_1'],
          'foo.host.name.keyword': ['host_name_other_value_keyword_1'],
          'foo.host.hostname': ['hostname_other_value_1'],
          'foo.host.hostname.keyword': ['hostname_other_value_keyword_1'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
      });

      test('invalid fields of several levels mixed with regular values will not be merged accidentally due to runtime fields being liberal"', () => {
        const _source: SignalSourceHit['_source'] = {};
        const fields: SignalSourceHit['fields'] = {
          foo: ['other_value_1'],
          'foo.bar': ['other_value_2'],
          'foo.bar.zed': ['zed_other_value_2'],
        };
        const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
        const merged = mergeMissingFieldsWithSource({ doc })._source;
        expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({
          foo: 'other_value_1',
        });
      });
    });
  });

  /**
   * These tests are around parent objects that are not nested but are array types. We do not try to merge
   * into these as this causes ambiguities between array types and object types.
   */
  describe('parent array objects', () => {
    test('parent array objects will not be overridden since that is an ambiguous use case for a top level value', () => {
      const _source: SignalSourceHit['_source'] = {
        foo: [
          {
            bar: 'value_1',
            mars: ['value_1'],
          },
        ],
      };
      const fields: SignalSourceHit['fields'] = {
        'foo.bar': ['other_value_1'],
        'foo.mars': ['other_value_2'],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
    });

    test('parent array objects will not be overridden since that is an ambiguous use case for a deeply nested value', () => {
      const _source: SignalSourceHit['_source'] = {
        foo: {
          zed: [
            {
              bar: 'value_1',
              mars: ['value_1'],
            },
          ],
        },
      };
      const fields: SignalSourceHit['fields'] = {
        'foo.zed.bar': ['other_value_1'],
        'foo.zed.mars': ['other_value_2'],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
    });
  });

  /**
   * Specific tests around nested field types such as ensuring we are unboxing when we can
   */
  describe('nested fields', () => {
    test('returns empty object since we only consider merging in primitive values and not nested fields', () => {
      const _source: SignalSourceHit['_source'] = {};
      const fields: SignalSourceHit['fields'] = {
        foo: [{ bar: ['single_value'], zed: ['single_value'] }],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>({});
    });

    test('does not touch the source object when it is empty arrays', () => {
      const _source: SignalSourceHit['_source'] = {
        foo: [
          {
            bar: [],
            zed: [],
          },
        ],
      };
      const fields: SignalSourceHit['fields'] = {
        foo: [{ bar: ['single_value'], zed: ['single_value'] }],
      };
      const doc: SignalSourceHit = { ...emptyEsResult(), _source, fields };
      const merged = mergeMissingFieldsWithSource({ doc })._source;
      expect(merged).toEqual<ReturnTypeMergeFieldsWithSource>(_source);
    });
  });
});
