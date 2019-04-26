/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseIntParam } from '../parse_int_param';

describe('parseIntParam', () => {
  it('parses a number', () => {
    const result = parseIntParam('23', 50);
    expect(result).toBe(23);
  });

  it('returns default value for empty string', () => {
    const result = parseIntParam('', 50);
    expect(result).toBe(50);
  });

  it('returns default value for non-numeric string', () => {
    const result = parseIntParam('abc', 50);
    expect(result).toBe(50);
  });
});
