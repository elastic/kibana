/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import {
  PrePackagedRulesAndTimelinesSchema,
  prePackagedRulesAndTimelinesSchema,
} from './prepackaged_rules_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('prepackaged_rules_schema', () => {
  test('it should validate an empty prepackaged response with defaults', () => {
    const payload: PrePackagedRulesAndTimelinesSchema = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = prePackagedRulesAndTimelinesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: PrePackagedRulesAndTimelinesSchema & { invalid_field: string } = {
      rules_installed: 0,
      rules_updated: 0,
      invalid_field: 'invalid',
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = prePackagedRulesAndTimelinesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_installed" number', () => {
    const payload: PrePackagedRulesAndTimelinesSchema = {
      rules_installed: -1,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = prePackagedRulesAndTimelinesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_updated"', () => {
    const payload: PrePackagedRulesAndTimelinesSchema = {
      rules_installed: 0,
      rules_updated: -1,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = prePackagedRulesAndTimelinesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_updated"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_installed" is not there', () => {
    const payload: PrePackagedRulesAndTimelinesSchema = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_installed;
    const decoded = prePackagedRulesAndTimelinesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_updated" is not there', () => {
    const payload: PrePackagedRulesAndTimelinesSchema = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_updated;
    const decoded = prePackagedRulesAndTimelinesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_updated"',
    ]);
    expect(message.schema).toEqual({});
  });
});
