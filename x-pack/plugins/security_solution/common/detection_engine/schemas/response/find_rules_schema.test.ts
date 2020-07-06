/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findRulesSchema, FindRulesSchema } from './find_rules_schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { RulesSchema } from './rules_schema';
import { exactCheck } from '../../../exact_check';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { getRulesSchemaMock } from './rules_schema.mocks';
import { getFindRulesSchemaMock } from './find_rules_schema.mocks';

describe('find_rules_schema', () => {
  test('it should validate a typical single find rules response', () => {
    const payload = getFindRulesSchemaMock();
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindRulesSchemaMock());
  });

  test('it should validate an empty find rules response', () => {
    const payload = getFindRulesSchemaMock();
    payload.data = [];
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    const expected = getFindRulesSchemaMock();
    expected.data = [];

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should invalidate a typical single find rules response if it is has an extra property on it', () => {
    const payload: FindRulesSchema & { invalid_data?: 'invalid' } = getFindRulesSchemaMock();
    payload.invalid_data = 'invalid';
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if the rules are invalid within it', () => {
    const payload = getFindRulesSchemaMock();
    const invalidRule: RulesSchema & { invalid_extra_data?: string } = getRulesSchemaMock();
    invalidRule.invalid_extra_data = 'invalid_data';
    payload.data = [invalidRule];
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_extra_data"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if the rule is missing a required field such as name', () => {
    const payload = getFindRulesSchemaMock();
    const invalidRule = getRulesSchemaMock();
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
    const payload = getFindRulesSchemaMock();
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
    const payload = getFindRulesSchemaMock();
    payload.perPage = -1;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "perPage"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if it has a negative page number', () => {
    const payload = getFindRulesSchemaMock();
    payload.page = -1;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "page"']);
    expect(message.schema).toEqual({});
  });

  test('it should invalidate a typical single find rules response if it has a negative total', () => {
    const payload = getFindRulesSchemaMock();
    payload.total = -1;
    const decoded = findRulesSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "total"']);
    expect(message.schema).toEqual({});
  });
});
