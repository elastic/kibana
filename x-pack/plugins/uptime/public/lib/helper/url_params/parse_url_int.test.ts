/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseUrlInt } from './parse_url_int';

describe('parseUrlInt', () => {
  it('parses a number', () => {
    const result = parseUrlInt('23', 50);
    expect(result).toBe(23);
  });

  it('returns default value for empty string', () => {
    const result = parseUrlInt('', 50);
    expect(result).toBe(50);
  });

  it('returns default value for non-numeric string', () => {
    const result = parseUrlInt('abc', 50);
    expect(result).toBe(50);
  });
});
