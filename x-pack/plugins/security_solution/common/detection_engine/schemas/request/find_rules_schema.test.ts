/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exactCheck } from '../../../exact_check';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { left } from 'fp-ts/lib/Either';
import { FindRulesSchema, findRulesSchema } from './find_rules_schema';

describe('find_rules_schema', () => {
  test('empty objects do validate', () => {
    const payload: FindRulesSchema = {};

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      page: 1,
      per_page: 20,
    });
  });

  test('all values validate', () => {
    const payload: FindRulesSchema = {
      per_page: 5,
      page: 1,
      sort_field: 'some field',
      fields: ['field 1', 'field 2'],
      filter: 'some filter',
      sort_order: 'asc',
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<FindRulesSchema> & { madeUp: string } = { madeUp: 'invalid value' };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('per_page validates', () => {
    const payload: FindRulesSchema = {
      per_page: 5,
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).per_page).toEqual(payload.per_page);
  });

  test('page validates', () => {
    const payload: FindRulesSchema = {
      page: 5,
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).page).toEqual(payload.page);
  });

  test('sort_field validates', () => {
    const payload: FindRulesSchema = {
      sort_field: 'value',
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).sort_field).toEqual('value');
  });

  test('fields validates with a string', () => {
    const payload: FindRulesSchema = {
      fields: ['some value'],
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).fields).toEqual(payload.fields);
  });

  test('fields validates with multiple strings', () => {
    const payload: FindRulesSchema = {
      fields: ['some value 1', 'some value 2'],
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).fields).toEqual(payload.fields);
  });

  test('fields does not validate with a number', () => {
    const payload: Omit<FindRulesSchema, 'fields'> & { fields: number } = {
      fields: 5,
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "fields"']);
    expect(message.schema).toEqual({});
  });

  test('per_page has a default of 20', () => {
    const payload: FindRulesSchema = {};

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).per_page).toEqual(20);
  });

  test('page has a default of 1', () => {
    const payload: FindRulesSchema = {};

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).page).toEqual(1);
  });

  test('filter works with a string', () => {
    const payload: FindRulesSchema = {
      filter: 'some value 1',
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).filter).toEqual(payload.filter);
  });

  test('filter does not work with a number', () => {
    const payload: Omit<FindRulesSchema, 'filter'> & { filter: number } = {
      filter: 5,
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "filter"']);
    expect(message.schema).toEqual({});
  });

  test('sort_order validates with desc and sort_field', () => {
    const payload: FindRulesSchema = {
      sort_order: 'desc',
      sort_field: 'some field',
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesSchema).sort_order).toEqual(payload.sort_order);
    expect((message.schema as FindRulesSchema).sort_field).toEqual(payload.sort_field);
  });

  test('sort_order does not validate with a string other than asc and desc', () => {
    const payload: Omit<FindRulesSchema, 'sort_order'> & { sort_order: string } = {
      sort_order: 'some other string',
      sort_field: 'some field',
    };

    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some other string" supplied to "sort_order"',
    ]);
    expect(message.schema).toEqual({});
  });
});
