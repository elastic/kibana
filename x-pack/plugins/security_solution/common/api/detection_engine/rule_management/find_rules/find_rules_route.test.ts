/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import type { FindRulesRequestQueryInput } from './find_rules_route.gen';
import { FindRulesRequestQuery } from './find_rules_route.gen';

describe('Find rules request schema', () => {
  test('empty objects do validate', () => {
    const payload: FindRulesRequestQueryInput = {};

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual({
      page: 1,
      per_page: 20,
    });
  });

  test('all values validate', () => {
    const payload: FindRulesRequestQuery = {
      per_page: 5,
      page: 1,
      sort_field: 'name',
      fields: ['field 1', 'field 2'],
      filter: 'some filter',
      sort_order: 'asc',
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('made up parameters are ignored', () => {
    const payload: Partial<FindRulesRequestQueryInput> & { madeUp: string } = {
      madeUp: 'invalid value',
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual({
      page: 1,
      per_page: 20,
    });
  });

  test('per_page validates', () => {
    const payload: FindRulesRequestQueryInput = {
      per_page: 5,
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.per_page).toEqual(payload.per_page);
  });

  test('page validates', () => {
    const payload: FindRulesRequestQueryInput = {
      page: 5,
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.page).toEqual(payload.page);
  });

  test('sort_field validates', () => {
    const payload: FindRulesRequestQueryInput = {
      sort_field: 'name',
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.sort_field).toEqual(payload.sort_field);
  });

  test('fields validates with a string', () => {
    const payload: FindRulesRequestQueryInput = {
      fields: ['some value'],
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.fields).toEqual(payload.fields);
  });

  test('fields validates with multiple strings', () => {
    const payload: FindRulesRequestQueryInput = {
      fields: ['some value 1', 'some value 2'],
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.fields).toEqual(payload.fields);
  });

  test('fields does not validate with a number', () => {
    const payload: Omit<FindRulesRequestQueryInput, 'fields'> & { fields: number } = {
      fields: 5,
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('fields: Expected array, received number');
  });

  test('filter works with a string', () => {
    const payload: FindRulesRequestQueryInput = {
      filter: 'some value 1',
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.filter).toEqual(payload.filter);
  });

  test('filter does not work with a number', () => {
    const payload: Omit<FindRulesRequestQueryInput, 'filter'> & { filter: number } = {
      filter: 5,
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('filter: Expected string, received number');
  });

  test('sort_order validates with desc and sort_field', () => {
    const payload: FindRulesRequestQueryInput = {
      sort_order: 'desc',
      sort_field: 'name',
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data.sort_order).toEqual(payload.sort_order);
    expect(result.data.sort_field).toEqual(payload.sort_field);
  });

  test('sort_order does not validate with a string other than asc and desc', () => {
    const payload: Omit<FindRulesRequestQueryInput, 'sort_order'> & { sort_order: string } = {
      sort_order: 'some other string',
      sort_field: 'name',
    };

    const result = FindRulesRequestQuery.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "sort_order: Invalid enum value. Expected 'asc' | 'desc', received 'some other string'"
    );
  });
});
