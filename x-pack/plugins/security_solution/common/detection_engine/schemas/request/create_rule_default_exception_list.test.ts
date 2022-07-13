/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import type { CreateRuleDefaultExceptionListSchema } from './create_rule_default_exception_list';
import { createRuleDefaultExceptionListSchema } from './create_rule_default_exception_list';

import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

describe('createRuleDefaultExceptionListSchema', () => {
  test('empty objects do not validate', () => {
    const payload: CreateRuleDefaultExceptionListSchema =
      {} as CreateRuleDefaultExceptionListSchema;

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({});
  });

  test('endpoint list types validate', () => {
    const payload: CreateRuleDefaultExceptionListSchema = {
      list_type: 'endpoint',
      rule_so_id: 'so_id',
    };

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('all values validate', () => {
    const payload: CreateRuleDefaultExceptionListSchema = {
      list: { ...getCreateExceptionListDetectionSchemaMock(), list_id: 'my_list' },
      list_type: 'detection',
      rule_so_id: 'so_id',
    };

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<CreateRuleDefaultExceptionListSchema> & { madeUp: string } = {
      list: getCreateExceptionListDetectionSchemaMock(),
      rule_so_id: 'so_id',
      list_type: 'detection',
      madeUp: 'invalid value',
    };

    const decoded = createRuleDefaultExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });
});
