/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseOtelDuration } from './parse_otel_duration';

describe('parseOtelDuration', () => {
  it('returns 0 when duration is undefined', () => {
    const result = parseOtelDuration(undefined);
    expect(result).toBe(0);
  });

  it('returns 0 when duration is an empty array', () => {
    const result = parseOtelDuration([]);
    expect(result).toBe(0);
  });

  it('parses the first element of an array and converts it to seconds', () => {
    const result = parseOtelDuration([1000, 2000]);
    expect(result).toBe(1);
  });

  it('parses a string duration and converts it to seconds', () => {
    const result = parseOtelDuration('2500');
    expect(result).toBe(2.5);
  });

  it('returns 0 for an invalid string duration', () => {
    const result = parseOtelDuration('invalid');
    expect(result).toBe(0);
  });

  it('handles a number array with a single element', () => {
    const result = parseOtelDuration([500]);
    expect(result).toBe(0.5);
  });

  it('handles a number array with multiple elements (only uses the first)', () => {
    const result = parseOtelDuration([3000, 4000, 5000]);
    expect(result).toBe(3);
  });
});
