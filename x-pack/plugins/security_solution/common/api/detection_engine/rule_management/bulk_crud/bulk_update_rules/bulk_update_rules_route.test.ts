/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import type { RuleUpdateProps } from '../../../model';
import { getUpdateRulesSchemaMock } from '../../../model/rule_schema/mocks';
import { BulkUpdateRulesRequestBody } from './bulk_update_rules_route.gen';

// only the basics of testing are here.
// see: update_rules_schema.test.ts for the bulk of the validation tests
// this just wraps updateRulesSchema in an array
describe('Bulk update rules request schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: BulkUpdateRulesRequestBody = [];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('made up values do not validate for a single element', () => {
    const payload: Array<{ madeUp: string }> = [{ madeUp: 'hi' }];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"`
    );
  });

  test('single array element does validate', () => {
    const payload: BulkUpdateRulesRequestBody = [getUpdateRulesSchemaMock()];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('two array elements do validate', () => {
    const payload: BulkUpdateRulesRequestBody = [
      getUpdateRulesSchemaMock(),
      getUpdateRulesSchemaMock(),
    ];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('single array element with a missing value (risk_score) will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"0.risk_score: Required"`);
  });

  test('two array elements where the first is valid but the second is invalid (risk_score) will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    const secondItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"1.risk_score: Required"`);
  });

  test('two array elements where the first is invalid (risk_score) but the second is valid will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    const secondItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"0.risk_score: Required"`);
  });

  test('two array elements where both are invalid (risk_score) will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    const secondItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.risk_score: Required, 1.risk_score: Required"`
    );
  });

  test('extra props will be omitted from the payload after validation', () => {
    const singleItem: RuleUpdateProps & { madeUpValue: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem: RuleUpdateProps & { madeUpValue: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual([getUpdateRulesSchemaMock(), getUpdateRulesSchemaMock()]);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const badSeverity = { ...getUpdateRulesSchemaMock(), severity: 'madeup' };
    const payload = [badSeverity];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'madeup'"`
    );
  });

  test('You can set "namespace" to a string', () => {
    const payload: BulkUpdateRulesRequestBody = [
      { ...getUpdateRulesSchemaMock(), namespace: 'a namespace' },
    ];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can set "note" to a string', () => {
    const payload: BulkUpdateRulesRequestBody = [
      { ...getUpdateRulesSchemaMock(), note: '# test markdown' },
    ];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can set "note" to an empty string', () => {
    const payload: BulkUpdateRulesRequestBody = [{ ...getUpdateRulesSchemaMock(), note: '' }];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cant set "note" to anything other than string', () => {
    const payload = [
      {
        ...getUpdateRulesSchemaMock(),
        note: {
          something: 'some object',
        },
      },
    ];

    const result = BulkUpdateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.note: Expected string, received object"`
    );
  });
});
