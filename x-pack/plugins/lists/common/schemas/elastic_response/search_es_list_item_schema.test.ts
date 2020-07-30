/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { SearchEsListItemSchema, searchEsListItemSchema } from './search_es_list_item_schema';
import { getSearchEsListItemMock } from './search_es_list_item_schema.mock';

describe('search_es_list_item_schema', () => {
  test('it should validate against the mock', () => {
    const payload: SearchEsListItemSchema = getSearchEsListItemMock();
    const decoded = searchEsListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate with a madeup value', () => {
    const payload: SearchEsListItemSchema & { madeupValue: string } = {
      ...getSearchEsListItemMock(),
      madeupValue: 'madeupvalue',
    };
    const decoded = searchEsListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupValue"']);
    expect(message.schema).toEqual({});
  });
});
