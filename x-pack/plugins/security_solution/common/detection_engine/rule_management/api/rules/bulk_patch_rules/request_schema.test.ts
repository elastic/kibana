/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import type { PatchRuleRequestBody } from '../patch_rule/request_schema';
import { BulkPatchRulesRequestBody } from './request_schema';

// only the basics of testing are here.
// see: patch_rules_schema.test.ts for the bulk of the validation tests
// this just wraps patchRulesSchema in an array
describe('Bulk patch rules request schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: BulkPatchRulesRequestBody = [];

    const decoded = BulkPatchRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(output.errors).toEqual([]);
    expect(output.schema).toEqual([]);
  });

  test('single array of [id] does validate', () => {
    const payload: BulkPatchRulesRequestBody = [{ id: '4125761e-51da-4de9-a0c8-42824f532ddb' }];

    const decoded = BulkPatchRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('two arrays of [id] validate', () => {
    const payload: BulkPatchRulesRequestBody = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { id: '192f403d-b285-4251-9e8b-785fcfcf22e8' },
    ];

    const decoded = BulkPatchRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('can set "note" to be a string', () => {
    const payload: BulkPatchRulesRequestBody = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { note: 'hi' },
    ];

    const decoded = BulkPatchRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('can set "note" to be an empty string', () => {
    const payload: BulkPatchRulesRequestBody = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { note: '' },
    ];

    const decoded = BulkPatchRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual(payload);
  });

  test('cannot set "note" to be anything other than a string', () => {
    const payload: Array<Omit<PatchRuleRequestBody, 'note'> & { note?: object }> = [
      { id: '4125761e-51da-4de9-a0c8-42824f532ddb' },
      { note: { someprop: 'some value here' } },
    ];

    const decoded = BulkPatchRulesRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "{"someprop":"some value here"}" supplied to "note"',
    ]);
    expect(output.schema).toEqual({});
  });
});
