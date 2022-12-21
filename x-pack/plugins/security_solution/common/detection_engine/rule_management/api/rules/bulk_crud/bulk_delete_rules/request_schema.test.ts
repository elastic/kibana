/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import { BulkDeleteRulesRequestBody } from './request_schema';

// only the basics of testing are here.
// see: query_rules_schema.test.ts for the bulk of the validation tests
// this just wraps queryRulesSchema in an array
describe('Bulk delete rules request schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: BulkDeleteRulesRequestBody = [];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual([]);
  });

  test('non uuid being supplied to id does not validate', () => {
    const payload: BulkDeleteRulesRequestBody = [
      {
        id: '1',
      },
    ];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['Invalid value "1" supplied to "id"']);
    expect(output.schema).toEqual({});
  });

  test('both rule_id and id being supplied do validate', () => {
    const payload: BulkDeleteRulesRequestBody = [
      {
        rule_id: '1',
        id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f',
      },
    ];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('only id validates with two elements', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
    ];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('only rule_id validates', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
    ];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('only rule_id validates with two elements', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { rule_id: '2' },
    ];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('both id and rule_id validates with two separate elements', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { rule_id: '2' },
    ];

    const decoded = BulkDeleteRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });
});
