/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import type { RuleUpdateProps } from '../../../../../rule_schema';
import { getUpdateRulesSchemaMock } from '../../../../../rule_schema/mocks';
import { BulkUpdateRulesRequestBody } from './request_schema';

// only the basics of testing are here.
// see: update_rules_schema.test.ts for the bulk of the validation tests
// this just wraps updateRulesSchema in an array
describe('Bulk update rules request schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: BulkUpdateRulesRequestBody = [];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(output.errors).toEqual([]);
    expect(output.schema).toEqual([]);
  });

  test('made up values do not validate for a single element', () => {
    const payload: Array<{ madeUp: string }> = [{ madeUp: 'hi' }];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toContain(
      'Invalid value "undefined" supplied to "description"'
    );
    expect(formatErrors(output.errors)).toContain(
      'Invalid value "undefined" supplied to "risk_score"'
    );
    expect(formatErrors(output.errors)).toContain('Invalid value "undefined" supplied to "name"');
    expect(formatErrors(output.errors)).toContain(
      'Invalid value "undefined" supplied to "severity"'
    );
    expect(output.schema).toEqual({});
  });

  test('single array element does validate', () => {
    const payload: BulkUpdateRulesRequestBody = [getUpdateRulesSchemaMock()];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('two array elements do validate', () => {
    const payload: BulkUpdateRulesRequestBody = [
      getUpdateRulesSchemaMock(),
      getUpdateRulesSchemaMock(),
    ];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('single array element with a missing value (risk_score) will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the first is valid but the second is invalid (risk_score) will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    const secondItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the first is invalid (risk_score) but the second is valid will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    const secondItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where both are invalid (risk_score) will not validate', () => {
    const singleItem = getUpdateRulesSchemaMock();
    const secondItem = getUpdateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the first is invalid (extra key and value) but the second is valid will not validate', () => {
    const singleItem: RuleUpdateProps & { madeUpValue: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem = getUpdateRulesSchemaMock();
    const payload = [singleItem, secondItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUpValue"']);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the second is invalid (extra key and value) but the first is valid will not validate', () => {
    const singleItem: RuleUpdateProps = getUpdateRulesSchemaMock();
    const secondItem: RuleUpdateProps & { madeUpValue: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUpValue"']);
    expect(output.schema).toEqual({});
  });

  test('two array elements where both are invalid (extra key and value) will not validate', () => {
    const singleItem: RuleUpdateProps & { madeUpValue: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem: RuleUpdateProps & { madeUpValue: string } = {
      ...getUpdateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const payload: BulkUpdateRulesRequestBody = [singleItem, secondItem];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUpValue,madeUpValue"']);
    expect(output.schema).toEqual({});
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const badSeverity = { ...getUpdateRulesSchemaMock(), severity: 'madeup' };
    const payload = [badSeverity];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['Invalid value "madeup" supplied to "severity"']);
    expect(output.schema).toEqual({});
  });

  test('You can set "namespace" to a string', () => {
    const payload: BulkUpdateRulesRequestBody = [
      { ...getUpdateRulesSchemaMock(), namespace: 'a namespace' },
    ];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('You can set "note" to a string', () => {
    const payload: BulkUpdateRulesRequestBody = [
      { ...getUpdateRulesSchemaMock(), note: '# test markdown' },
    ];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('You can set "note" to an empty string', () => {
    const payload: BulkUpdateRulesRequestBody = [{ ...getUpdateRulesSchemaMock(), note: '' }];

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
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

    const decoded = BulkUpdateRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "{"something":"some object"}" supplied to "note"',
    ]);
    expect(output.schema).toEqual({});
  });
});
