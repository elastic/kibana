/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { BulkDeleteRulesRequestBody } from './bulk_delete_rules_route.gen';

// only the basics of testing are here.
// see: query_rules_schema.test.ts for the bulk of the validation tests
// this just wraps queryRulesSchema in an array
describe('Bulk delete rules request schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: BulkDeleteRulesRequestBody = [];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('non uuid being supplied to id does not validate', () => {
    const payload: BulkDeleteRulesRequestBody = [
      {
        id: '1',
      },
    ];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"0.id: Invalid uuid"`);
  });

  test('both rule_id and id being supplied do validate', () => {
    const payload: BulkDeleteRulesRequestBody = [
      {
        rule_id: '1',
        id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f',
      },
    ];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('only id validates with two elements', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
    ];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('only rule_id validates', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
    ];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('only rule_id validates with two elements', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { rule_id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { rule_id: '2' },
    ];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('both id and rule_id validates with two separate elements', () => {
    const payload: BulkDeleteRulesRequestBody = [
      { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' },
      { rule_id: '2' },
    ];

    const result = BulkDeleteRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });
});
