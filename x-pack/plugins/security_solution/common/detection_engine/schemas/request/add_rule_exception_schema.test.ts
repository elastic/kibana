/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { addRuleExceptions } from './add_rule_exception_schema';
import type { AddRuleExceptionSchema } from './add_rule_exception_schema';

import {
  getCreateExceptionListItemSchemaMock,
  getCreateExceptionListItemMinimalSchemaMockWithoutId,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';

describe('addRuleExceptions', () => {
  test('empty objects do not validate', () => {
    const payload: AddRuleExceptionSchema = {} as AddRuleExceptionSchema;

    const decoded = addRuleExceptions.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({});
  });

  test('empty array of items does not validate', () => {
    const payload: AddRuleExceptionSchema = [];

    const decoded = addRuleExceptions.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({});
  });

  test('all values validate', () => {
    const payload: AddRuleExceptionSchema = {
      items: [
        getCreateExceptionListItemSchemaMock(),
        getCreateExceptionListItemMinimalSchemaMockWithoutId(),
      ],
    };

    const decoded = addRuleExceptions.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<AddRuleExceptionSchema> & { madeUp: string } = {
      items: [getCreateExceptionListItemSchemaMock()],
      madeUp: 'invalid value',
    };

    const decoded = addRuleExceptions.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });
});
