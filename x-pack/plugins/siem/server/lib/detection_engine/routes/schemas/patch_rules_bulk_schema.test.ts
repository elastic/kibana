/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { patchRulesBulkSchema } from './patch_rules_bulk_schema';
import { PatchRuleAlertParamsRest } from '../../rules/types';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../feature_flags';

// only the basics of testing are here.
// see: patch_rules_schema.test.ts for the bulk of the validation tests
// this just wraps patchRulesSchema in an array
describe('patch_rules_bulk_schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('can take an empty array and validate it', () => {
    expect(
      patchRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([]).error
    ).toBeFalsy();
  });

  test('made up values do not validate', () => {
    expect(
      patchRulesBulkSchema.validate<[{ madeUp: string }]>([
        {
          madeUp: 'hi',
        },
      ]).error
    ).toBeTruthy();
  });

  test('single array of [id] does validate', () => {
    expect(
      patchRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          id: 'rule-1',
        },
      ]).error
    ).toBeFalsy();
  });

  test('two values of [id] does validate', () => {
    expect(
      patchRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          id: 'rule-1',
        },
        {
          id: 'rule-2',
        },
      ]).error
    ).toBeFalsy();
  });

  test('can set "note" to be a string', () => {
    expect(
      patchRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          id: 'rule-1',
          note: 'hi',
        },
      ]).error
    ).toBeFalsy();
  });

  test('can set "note" to be an empty string', () => {
    expect(
      patchRulesBulkSchema.validate<Array<Partial<PatchRuleAlertParamsRest>>>([
        {
          id: 'rule-1',
          note: '',
        },
      ]).error
    ).toBeFalsy();
  });

  test('cannot set "note" to be anything other than a string', () => {
    expect(
      patchRulesBulkSchema.validate<
        Array<Partial<Omit<PatchRuleAlertParamsRest, 'note'> & { note: object }>>
      >([
        {
          id: 'rule-1',
          note: {
            someprop: 'some value here',
          },
        },
      ]).error.message
    ).toEqual(
      '"value" at position 0 fails because [child "note" fails because ["note" must be a string]]'
    );
  });
});
