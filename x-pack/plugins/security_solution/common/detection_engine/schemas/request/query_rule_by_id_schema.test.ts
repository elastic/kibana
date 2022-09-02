/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleByIdSchema } from './query_rule_by_id_schema';
import { queryRuleByIdSchema } from './query_rule_by_id_schema';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

describe('query_rule_by_id_schema', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<QueryRuleByIdSchema> = {};

    const decoded = queryRuleByIdSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('validates string for id', () => {
    const payload: Partial<QueryRuleByIdSchema> = {
      id: '4656dc92-5832-11ea-8e2d-0242ac130003',
    };

    const decoded = queryRuleByIdSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      id: '4656dc92-5832-11ea-8e2d-0242ac130003',
    });
  });
});
