/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryRulesBulkSchema, QueryRulesBulkSchema } from './query_rules_bulk_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight } from '../../../test_utils';
import { formatErrors } from '../../../format_errors';

// only the basics of testing are here.
// see: query_rules_schema.test.ts for the bulk of the validation tests
// this just wraps queryRulesSchema in an array
describe('query_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: QueryRulesBulkSchema = [];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual([]);
  });

  test('non uuid being supplied to id does not validate', () => {
    const payload: QueryRulesBulkSchema = [
      {
        id: '1',
      },
    ];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['Invalid value "1" supplied to "id"']);
    expect(output.schema).toEqual({});
  });

  test('both rule_id and id being supplied do validate', () => {
    const payload: QueryRulesBulkSchema = [
      {
        rule_id: '1',
        id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f',
      },
    ];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('only id validates with two elements', () => {
    const payload: QueryRulesBulkSchema = [
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
    ];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('only rule_id validates', () => {
    const payload: QueryRulesBulkSchema = [{ rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' }];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('only rule_id validates with two elements', () => {
    const payload: QueryRulesBulkSchema = [
      { rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { rule_id: '2' },
    ];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('both id and rule_id validates with two separate elements', () => {
    const payload: QueryRulesBulkSchema = [
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { rule_id: '2' },
    ];

    const decoded = queryRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });
});
