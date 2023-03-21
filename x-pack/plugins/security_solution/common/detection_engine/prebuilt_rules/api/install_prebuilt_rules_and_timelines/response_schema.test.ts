/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { InstallPrebuiltRulesAndTimelinesResponse } from './response_schema';

describe('Install prebuilt rules and timelines response schema', () => {
  test('it should validate an empty prepackaged response with defaults', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = InstallPrebuiltRulesAndTimelinesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse & { invalid_field: string } = {
      rules_installed: 0,
      rules_updated: 0,
      invalid_field: 'invalid',
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = InstallPrebuiltRulesAndTimelinesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_installed" number', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: -1,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = InstallPrebuiltRulesAndTimelinesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_updated"', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: -1,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const decoded = InstallPrebuiltRulesAndTimelinesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_updated"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_installed" is not there', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_installed;
    const decoded = InstallPrebuiltRulesAndTimelinesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_installed"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_updated" is not there', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_updated;
    const decoded = InstallPrebuiltRulesAndTimelinesResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_updated"',
    ]);
    expect(message.schema).toEqual({});
  });
});
