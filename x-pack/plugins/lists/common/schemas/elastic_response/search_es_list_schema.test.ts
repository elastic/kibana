/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';

import { SearchEsListSchema, searchEsListSchema } from './search_es_list_schema';
import { getSearchEsListMock } from './search_es_list_schema.mock';

describe('search_es_list_schema', () => {
  test('it should validate against the mock', () => {
    const payload: SearchEsListSchema = getSearchEsListMock();
    const decoded = searchEsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when a madeup value', () => {
    const payload: SearchEsListSchema & { madeupValue: string } = {
      ...getSearchEsListMock(),
      madeupValue: 'madeupvalue',
    };
    const decoded = searchEsListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupValue"']);
    expect(message.schema).toEqual({});
  });
});
