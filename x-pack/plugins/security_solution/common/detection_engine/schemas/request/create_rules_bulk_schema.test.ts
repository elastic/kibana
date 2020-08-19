/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createRulesBulkSchema,
  CreateRulesBulkSchema,
  CreateRulesBulkSchemaDecoded,
} from './create_rules_bulk_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight } from '../../../test_utils';
import {
  getCreateRulesSchemaMock,
  getCreateRulesSchemaDecodedMock,
} from './create_rules_schema.mock';
import { formatErrors } from '../../../format_errors';
import { CreateRulesSchema } from './create_rules_schema';

// only the basics of testing are here.
// see: create_rules_schema.test.ts for the bulk of the validation tests
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
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "description"',
      'Invalid value "undefined" supplied to "risk_score"',
      'Invalid value "undefined" supplied to "name"',
      'Invalid value "undefined" supplied to "severity"',
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('single array element does validate', () => {
    const payload: CreateRulesBulkSchema = [getCreateRulesSchemaMock()];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual([getCreateRulesSchemaDecodedMock()]);
  });

  test('two array elements do validate', () => {
    const payload: CreateRulesBulkSchema = [getCreateRulesSchemaMock(), getCreateRulesSchemaMock()];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual([
      getCreateRulesSchemaDecodedMock(),
      getCreateRulesSchemaDecodedMock(),
    ]);
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
    const singleItem: CreateRulesSchema & { madeUpValue: string } = {
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
    const singleItem: CreateRulesSchema = getCreateRulesSchemaMock();
    const secondItem: CreateRulesSchema & { madeUpValue: string } = {
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
    const singleItem: CreateRulesSchema & { madeUpValue: string } = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem: CreateRulesSchema & { madeUpValue: string } = {
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

  test('The default for "from" will be "now-6m"', () => {
    const { from, ...withoutFrom } = getCreateRulesSchemaMock();
    const payload: CreateRulesBulkSchema = [withoutFrom];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect((output.schema as CreateRulesBulkSchemaDecoded)[0].from).toEqual('now-6m');
  });

  test('The default for "to" will be "now"', () => {
    const { to, ...withoutTo } = getCreateRulesSchemaMock();
    const payload: CreateRulesBulkSchema = [withoutTo];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect((output.schema as CreateRulesBulkSchemaDecoded)[0].to).toEqual('now');
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
    expect(output.schema).toEqual([
      { ...getCreateRulesSchemaDecodedMock(), note: '# test markdown' },
    ]);
  });

  test('You can set "note" to an empty string', () => {
    const payload: CreateRulesBulkSchema = [{ ...getCreateRulesSchemaMock(), note: '' }];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual([{ ...getCreateRulesSchemaDecodedMock(), note: '' }]);
  });

  test('You can set "note" to anything other than string', () => {
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

  test('The default for "actions" will be an empty array', () => {
    const { actions, ...withoutActions } = getCreateRulesSchemaMock();
    const payload: CreateRulesBulkSchema = [withoutActions];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect((output.schema as CreateRulesBulkSchemaDecoded)[0].actions).toEqual([]);
  });

  test('The default for "throttle" will be null', () => {
    const { throttle, ...withoutThrottle } = getCreateRulesSchemaMock();
    const payload: CreateRulesBulkSchema = [withoutThrottle];

    const decoded = createRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect((output.schema as CreateRulesBulkSchemaDecoded)[0].throttle).toEqual(null);
  });
});
