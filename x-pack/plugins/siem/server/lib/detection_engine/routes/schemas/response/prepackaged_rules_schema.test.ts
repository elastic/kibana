/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { PrePackagedRulesSchema, prePackagedRulesSchema } from './prepackaged_rules_schema';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../../feature_flags';
import { exactCheck } from '../../../../../../common/exact_check';
import { getPaths, foldLeftRight } from '../../../../../../common/test_utils';

describe('prepackaged_rules_schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('it should validate an empty prepackaged response with defaults', () => {
    const payload: PrePackagedRulesSchema = { rules_installed: 0, rules_updated: 0 };
    const decoded = prePackagedRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: PrePackagedRulesSchema & { invalid_field: string } = {
      rules_installed: 0,
      rules_updated: 0,
      invalid_field: 'invalid',
    };
    const decoded = prePackagedRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_installed" number', () => {
    const payload: PrePackagedRulesSchema = { rules_installed: -1, rules_updated: 0 };
    const decoded = prePackagedRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_updated"', () => {
    const payload: PrePackagedRulesSchema = { rules_installed: 0, rules_updated: -1 };
    const decoded = prePackagedRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_updated"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_installed" is not there', () => {
    const payload: PrePackagedRulesSchema = { rules_installed: 0, rules_updated: 0 };
    delete payload.rules_installed;
    const decoded = prePackagedRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_updated" is not there', () => {
    const payload: PrePackagedRulesSchema = { rules_installed: 0, rules_updated: 0 };
    delete payload.rules_updated;
    const decoded = prePackagedRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_updated"',
    ]);
    expect(message.schema).toEqual({});
  });
});
