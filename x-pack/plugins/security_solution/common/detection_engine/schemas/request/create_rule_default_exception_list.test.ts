/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { CreateRuleDefaultExceptionListSchema, createRuleDefaultExceptionListSchema } from './create_rule_default_exception_list';

import { getCreateExceptionListSchemaMock } from '../../../../../lists/common/schemas/request/create_exception_list_schema.mock'

describe('createRuleDefaultExceptionListSchema', () => {
  test('empty objects do not validate', () => {
    const payload: CreateRuleDefaultExceptionListSchema = {};

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({});
  });

  test('all values validate', () => {
    const payload: CreateRuleDefaultExceptionListSchema = {
      list: { ...getCreateExceptionListSchemaMock(), list_id: 'my_list' },
      rule_so_id: 'so_id',
      rule_id: 'rule_id',
    };

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<CreateRuleDefaultExceptionListSchema> & { madeUp: string } = { 
      list: getCreateExceptionListSchemaMock(),
      rule_so_id: 'so_id',
      rule_id: 'rule_id',
      madeUp: 'invalid value'
    };

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });
});
