/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { GetPrebuiltRulesAndTimelinesStatusResponse } from './response_schema';

describe('Get prebuilt rules and timelines status response schema', () => {
  test('it should validate an empty prepackaged response with defaults', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse = {
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: 0,
      rules_custom_installed: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse & { invalid_field: string } = {
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: 0,
      rules_custom_installed: 0,
      invalid_field: 'invalid',
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_installed" number', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse = {
      rules_installed: -1,
      rules_not_installed: 0,
      rules_not_updated: 0,
      rules_custom_installed: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_not_installed"', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse = {
      rules_installed: 0,
      rules_not_installed: -1,
      rules_not_updated: 0,
      rules_custom_installed: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_not_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_not_updated"', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse = {
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: -1,
      rules_custom_installed: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_not_updated"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_custom_installed"', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse = {
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: 0,
      rules_custom_installed: -1,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_custom_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_installed" is not there', () => {
    const payload: GetPrebuiltRulesAndTimelinesStatusResponse = {
      rules_installed: 0,
      rules_not_installed: 0,
      rules_not_updated: 0,
      rules_custom_installed: 0,
      timelines_installed: 0,
      timelines_not_installed: 0,
      timelines_not_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_installed;
    const decoded = GetPrebuiltRulesAndTimelinesStatusResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });
});
