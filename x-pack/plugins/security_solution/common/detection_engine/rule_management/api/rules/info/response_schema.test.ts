/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { RulesInfoResponse } from './response_schema';

describe('Rules info response schema', () => {
  test('it should validate an empty response with defaults', () => {
    const payload: RulesInfoResponse = {
      rules_custom_count: 0,
      rules_prebuilt_installed_count: 0,
      tags: [],
    };
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an non empty response with defaults', () => {
    const payload: RulesInfoResponse = {
      rules_custom_count: 10,
      rules_prebuilt_installed_count: 20,
      tags: ['a', 'b', 'c'],
    };
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: RulesInfoResponse & { invalid_field: string } = {
      rules_custom_count: 0,
      rules_prebuilt_installed_count: 0,
      tags: [],
      invalid_field: 'invalid',
    };
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty response with a negative "rules_prebuilt_installed_count" number', () => {
    const payload: RulesInfoResponse = {
      rules_custom_count: 0,
      rules_prebuilt_installed_count: -1,
      tags: [],
    };
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_prebuilt_installed_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty response with a negative "rules_custom_count"', () => {
    const payload: RulesInfoResponse = {
      rules_custom_count: -1,
      rules_prebuilt_installed_count: 0,
      tags: [],
    };
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_custom_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "rules_prebuilt_installed_count" is not there', () => {
    const payload: RulesInfoResponse = {
      rules_custom_count: 0,
      rules_prebuilt_installed_count: 0,
      tags: [],
    };
    // @ts-expect-error
    delete payload.rules_prebuilt_installed_count;
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_prebuilt_installed_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty response with wrong "tags"', () => {
    const payload: RulesInfoResponse = {
      rules_custom_count: 0,
      rules_prebuilt_installed_count: 0,
      tags: [1] as unknown as string[],
    };
    const decoded = RulesInfoResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "tags"']);
    expect(message.schema).toEqual({});
  });
});
