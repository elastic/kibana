/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseInterval } from './parse_interval';

describe('parse interval util', () => {
  test('should correctly parse an interval containing a valid unit and value', () => {
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

  test('should correctly handle zero value intervals', () => {
    expect(parseInterval('0h')!.as('h')).toBe(0);
    expect(parseInterval('0d')).toBe(null);
  });

  test('should return null for an invalid interval', () => {
    expect(parseInterval('')).toBe(null);
    expect(parseInterval('234asdf')).toBe(null);
    expect(parseInterval('m')).toBe(null);
    expect(parseInterval('1.5h')).toBe(null);
  });

  test('should correctly check for whether the interval units are valid Elasticsearch time units', () => {
    expect(parseInterval('100s', true)!.as('s')).toBe(100);
    expect(parseInterval('5m', true)!.as('m')).toBe(5);
    expect(parseInterval('24h', true)!.as('h')).toBe(24);
    expect(parseInterval('7d', true)!.as('d')).toBe(7);
    expect(parseInterval('1w', true)).toBe(null);
    expect(parseInterval('1M', true)).toBe(null);
    expect(parseInterval('1y', true)).toBe(null);
  });
});
