/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRulesBulkSchema, CreateRulesBulkSchema } from './create_rules_bulk_schema';
import { exactCheck, foldLeftRight, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { getCreateRulesSchemaMock } from './rule_schemas.mock';

// only the basics of testing are here.
// see: rule_schemas.test.ts for the bulk of the validation tests
// this just wraps createRulesSchema in an array
describe('create_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: CreateRulesBulkSchema = [];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(output.errors).toEqual([]);
    expect(output.schema).toEqual([]);
  });

  test('made up values do not validate for a single element', () => {
    const payload: Array<{ madeUp: string }> = [{ madeUp: 'hi' }];

    const decoded = createRulesBulkSchema.decode(payload);
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
    const payload: CreateRulesBulkSchema = [getCreateRulesSchemaMock()];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('two array elements do validate', () => {
    const payload: CreateRulesBulkSchema = [getCreateRulesSchemaMock(), getCreateRulesSchemaMock()];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('single array element with a missing value (risk_score) will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: CreateRulesBulkSchema = [singleItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the first is valid but the second is invalid (risk_score) will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: CreateRulesBulkSchema = [singleItem, secondItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the first is invalid (risk_score) but the second is valid will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: CreateRulesBulkSchema = [singleItem, secondItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where both are invalid (risk_score) will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: CreateRulesBulkSchema = [singleItem, secondItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "risk_score"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the first is invalid (extra key and value) but the second is valid will not validate', () => {
    const singleItem = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem = getCreateRulesSchemaMock();
    const payload: CreateRulesBulkSchema = [singleItem, secondItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUpValue"']);
    expect(output.schema).toEqual({});
  });

  test('two array elements where the second is invalid (extra key and value) but the first is valid will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const payload: CreateRulesBulkSchema = [singleItem, secondItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUpValue"']);
    expect(output.schema).toEqual({});
  });

  test('two array elements where both are invalid (extra key and value) will not validate', () => {
    const singleItem = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const payload: CreateRulesBulkSchema = [singleItem, secondItem];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUpValue,madeUpValue"']);
    expect(output.schema).toEqual({});
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const badSeverity = { ...getCreateRulesSchemaMock(), severity: 'madeup' };
    const payload = [badSeverity];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['Invalid value "madeup" supplied to "severity"']);
    expect(output.schema).toEqual({});
  });

  test('You can set "note" to a string', () => {
    const payload: CreateRulesBulkSchema = [
      { ...getCreateRulesSchemaMock(), note: '# test markdown' },
    ];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('You can set "note" to an empty string', () => {
    const payload: CreateRulesBulkSchema = [{ ...getCreateRulesSchemaMock(), note: '' }];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('You cant set "note" to anything other than string', () => {
    const payload = [
      {
        ...getCreateRulesSchemaMock(),
        note: {
          something: 'some object',
        },
      },
    ];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "{"something":"some object"}" supplied to "note"',
    ]);
    expect(output.schema).toEqual({});
  });
});
