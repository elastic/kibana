/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { GetPrebuiltRulesAndTimelinesStatusResponse } from './get_prebuilt_rules_and_timelines_status_route.gen';

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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "Unrecognized key(s) in object: 'invalid_field'"
    );
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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'rules_installed: Number must be greater than or equal to 0'
    );
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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'rules_not_installed: Number must be greater than or equal to 0'
    );
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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'rules_not_updated: Number must be greater than or equal to 0'
    );
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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'rules_custom_installed: Number must be greater than or equal to 0'
    );
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
    const result = GetPrebuiltRulesAndTimelinesStatusResponse.safeParse(payload);

    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('rules_installed: Required');
  });
});
