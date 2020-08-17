/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { DefaultStringBooleanFalse } from './default_string_boolean_false';

describe('default_string_boolean_false', () => {
  test('it should validate a boolean false', () => {
    const payload = false;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a boolean true', () => {
    const payload = true;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultStringBooleanFalse"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default false', () => {
    const payload = null;
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(false);
  });

  test('it should return a default false when given a string of "false"', () => {
    const payload = 'false';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(false);
  });

  test('it should return a default true when given a string of "true"', () => {
    const payload = 'true';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(true);
  });

  test('it should return a default true when given a string of "TruE"', () => {
    const payload = 'TruE';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(true);
  });

  test('it should not work with a strong of junk "junk"', () => {
    const payload = 'junk';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "junk" supplied to "DefaultStringBooleanFalse"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not work with an empty string', () => {
    const payload = '';
    const decoded = DefaultStringBooleanFalse.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "" supplied to "DefaultStringBooleanFalse"',
    ]);
    expect(message.schema).toEqual({});
  });
});
