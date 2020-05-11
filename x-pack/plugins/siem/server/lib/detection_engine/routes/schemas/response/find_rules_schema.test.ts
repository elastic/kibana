/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findRulesSchema, FindRulesSchema } from './find_rules_schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { getFindResponseSingle, getBaseResponsePayload } from './__mocks__/utils';
import { left } from 'fp-ts/lib/Either';
import { RulesSchema } from './rules_schema';
import { setFeatureFlagsForTestsOnly, unSetFeatureFlagsForTestsOnly } from '../../../feature_flags';
import { getPaths, foldLeftRight } from '../../../../../utils/build_validation/__mocks__/utils';
import { exactCheck } from '../../../../../utils/build_validation/exact_check';

describe('find_rules_schema', () => {
  beforeAll(() => {
    setFeatureFlagsForTestsOnly();
  });

  afterAll(() => {
    unSetFeatureFlagsForTestsOnly();
  });

  test('it should validate a typical single find rules response', () => {
    const payload = getFindResponseSingle();
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindResponseSingle());
  });

  test('it should validate an empty find rules response', () => {
    const payload = getFindResponseSingle();
    payload.data = [];
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    const expected = getFindResponseSingle();
    expected.data = [];

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should invalidate a typical single find rules response if it is has an extra property on it', () => {
    const payload: FindRulesSchema & { invalid_data?: 'invalid' } = getFindResponseSingle();
    payload.invalid_data = 'invalid';
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if the rules are invalid within it', () => {
    const payload = getFindResponseSingle();
    const invalidRule: RulesSchema & { invalid_extra_data?: string } = getBaseResponsePayload();
    invalidRule.invalid_extra_data = 'invalid_data';
    payload.data = [invalidRule];
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if the rule is missing a required field such as name', () => {
    const payload = getFindResponseSingle();
    const invalidRule = getBaseResponsePayload();
    delete invalidRule.name;
    payload.data = [invalidRule];
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if it is missing perPage', () => {
    const payload = getFindResponseSingle();
    delete payload.perPage;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "perPage"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if it has a negative perPage number', () => {
    const payload = getFindResponseSingle();
    payload.perPage = -1;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "perPage"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if it has a negative page number', () => {
    const payload = getFindResponseSingle();
    payload.page = -1;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "page"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if it has a negative total', () => {
    const payload = getFindResponseSingle();
    payload.total = -1;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "total"']);
    expect(message.schema).toEqual({});
  });
});
