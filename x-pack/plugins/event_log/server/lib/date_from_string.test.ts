/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DateFromString, PositiveNumberFromString } from './date_from_string';
import { right, isLeft } from 'fp-ts/lib/Either';

describe('DateFromString', () => {
  test('validated and parses a string into a Date', () => {
    const date = new Date(1973, 10, 30);
    expect(DateFromString.decode(date.toISOString())).toEqual(right(date));
  });

  test('validated and returns a failure for an actual Date', () => {
    const date = new Date(1973, 10, 30);
    expect(isLeft(DateFromString.decode(date))).toEqual(true);
  });

  test('validated and returns a failure for an invalid Date string', () => {
    expect(isLeft(DateFromString.decode('1234-23-45'))).toEqual(true);
  });

  test('validated and returns a failure for a null value', () => {
    expect(isLeft(DateFromString.decode(null))).toEqual(true);
  });
});

describe('PositiveNumberFromString', () => {
  test('validated and parses a string into a positive number', () => {
    expect(PositiveNumberFromString.decode('1')).toEqual(right(1));
  });

  test('validated and returns a failure for an invalid number', () => {
    expect(isLeft(PositiveNumberFromString.decode('a23'))).toEqual(true);
  });

  test('validated and returns a failure for a negative number', () => {
    expect(isLeft(PositiveNumberFromString.decode('-45'))).toEqual(true);
  });

  test('validated and returns a failure for a null value', () => {
    expect(isLeft(PositiveNumberFromString.decode(null))).toEqual(true);
  });
});
