/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseInterval } from './parse_interval';

describe('ML parse interval util', () => {
  test('correctly parses an interval containing unit and value', () => {
    expect(parseInterval('1d')!.as('d')).toBe(1);
    expect(parseInterval('2y')!.as('y')).toBe(2);
    expect(parseInterval('5M')!.as('M')).toBe(5);
    expect(parseInterval('5m')!.as('m')).toBe(5);
    expect(parseInterval('250ms')!.as('ms')).toBe(250);
    expect(parseInterval('100s')!.as('s')).toBe(100);
    expect(parseInterval('23d')!.as('d')).toBe(23);
    expect(parseInterval('52w')!.as('w')).toBe(52);
    expect(parseInterval('0s')!.as('s')).toBe(0);
    expect(parseInterval('0s')!.as('h')).toBe(0);
  });

  test('correctly handles zero value intervals', () => {
    expect(parseInterval('0h')!.as('h')).toBe(0);
    expect(parseInterval('0d')).toBe(null);
  });

  test('returns null for an invalid interval', () => {
    expect(parseInterval('')).toBe(null);
    expect(parseInterval('234asdf')).toBe(null);
    expect(parseInterval('m')).toBe(null);
    expect(parseInterval('1.5h')).toBe(null);
  });
});
