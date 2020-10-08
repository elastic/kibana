/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { patchRulesBulkSchema, PatchRulesBulkSchema } from './patch_rules_bulk_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight } from '../../../test_utils';
import { formatErrors } from '../../../format_errors';
import { PatchRulesSchema } from './patch_rules_schema';

// only the basics of testing are here.
// see: patch_rules_schema.test.ts for the bulk of the validation tests
// this just wraps patchRulesSchema in an array
describe('patch_rules_bulk_schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: PatchRulesBulkSchema = [];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(output.errors).toEqual([]);
    expect(output.schema).toEqual([]);
  });

  test('made up values do not validate for a single element', () => {
    const payload: Array<{ madeUp: string }> = [{ madeUp: 'hi' }];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "madeUp"']);
    expect(output.schema).toEqual({});
  });

  test('single array of [id] does validate', () => {
    const payload: PatchRulesBulkSchema = [{ id: '4125761e-51da-4de9-a0c8-42824f532ddb' }];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('two arrays of [id] validate', () => {
    const payload: PatchRulesBulkSchema = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { id: '192f403d-b285-4251-9e8b-785fcfcf22e8' },
    ];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('can set "note" to be a string', () => {
    const payload: PatchRulesBulkSchema = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { note: 'hi' },
    ];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('can set "note" to be an empty string', () => {
    const payload: PatchRulesBulkSchema = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { note: '' },
    ];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('cannot set "note" to be anything other than a string', () => {
    const payload: Array<Omit<PatchRulesSchema, 'note'> & { note?: object }> = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { note: { someprop: 'some value here' } },
    ];

    const decoded = patchRulesBulkSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "{"someprop":"some value here"}" supplied to "note"',
    ]);
    expect(output.schema).toEqual({});
  });
});
