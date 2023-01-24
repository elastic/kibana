/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { FindRulesRequestQuery } from './request_schema';

describe('Find rules request schema', () => {
  test('empty objects do validate', () => {
    const payload: FindRulesRequestQuery = {};

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      page: 1,
      per_page: 20,
    });
  });

  test('all values validate', () => {
    const payload: FindRulesRequestQuery = {
      per_page: 5,
      page: 1,
      sort_field: 'some field',
      fields: ['field 1', 'field 2'],
      filter: 'some filter',
      sort_order: 'asc',
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<FindRulesRequestQuery> & { madeUp: string } = {
      madeUp: 'invalid value',
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });

  test('per_page validates', () => {
    const payload: FindRulesRequestQuery = {
      per_page: 5,
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).per_page).toEqual(payload.per_page);
  });

  test('page validates', () => {
    const payload: FindRulesRequestQuery = {
      page: 5,
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).page).toEqual(payload.page);
  });

  test('sort_field validates', () => {
    const payload: FindRulesRequestQuery = {
      sort_field: 'value',
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).sort_field).toEqual('value');
  });

  test('fields validates with a string', () => {
    const payload: FindRulesRequestQuery = {
      fields: ['some value'],
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).fields).toEqual(payload.fields);
  });

  test('fields validates with multiple strings', () => {
    const payload: FindRulesRequestQuery = {
      fields: ['some value 1', 'some value 2'],
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).fields).toEqual(payload.fields);
  });

  test('fields does not validate with a number', () => {
    const payload: Omit<FindRulesRequestQuery, 'fields'> & { fields: number } = {
      fields: 5,
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "fields"']);
    expect(message.schema).toEqual({});
  });

  test('per_page has a default of 20', () => {
    const payload: FindRulesRequestQuery = {};

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).per_page).toEqual(20);
  });

  test('page has a default of 1', () => {
    const payload: FindRulesRequestQuery = {};

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).page).toEqual(1);
  });

  test('filter works with a string', () => {
    const payload: FindRulesRequestQuery = {
      filter: 'some value 1',
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).filter).toEqual(payload.filter);
  });

  test('filter does not work with a number', () => {
    const payload: Omit<FindRulesRequestQuery, 'filter'> & { filter: number } = {
      filter: 5,
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to "filter"']);
    expect(message.schema).toEqual({});
  });

  test('sort_order validates with desc and sort_field', () => {
    const payload: FindRulesRequestQuery = {
      sort_order: 'desc',
      sort_field: 'some field',
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as FindRulesRequestQuery).sort_order).toEqual(payload.sort_order);
    expect((message.schema as FindRulesRequestQuery).sort_field).toEqual(payload.sort_field);
  });

  test('sort_order does not validate with a string other than asc and desc', () => {
    const payload: Omit<FindRulesRequestQuery, 'sort_order'> & { sort_order: string } = {
      sort_order: 'some other string',
      sort_field: 'some field',
    };

    const decoded = FindRulesRequestQuery.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some other string" supplied to "sort_order"',
    ]);
    expect(message.schema).toEqual({});
  });
});
