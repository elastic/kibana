/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toBooleanFromString } from './to_boolean_from_string';

describe('toBooleanFromString', () => {
  it("parses 'true' to true", () => {
    expect(toBooleanFromString.parse('true')).toBe(true);
  });

  it("parses 'false' to false", () => {
    expect(toBooleanFromString.parse('false')).toBe(false);
  });

  // Route defaults (e.g. `showCriticalPath: ''`) and legacy URLs rely on this:
  // any non-'true' string, and a missing value, decode to false (matching the
  // old io-ts `toBooleanRt`).
  it("parses '' to false", () => {
    expect(toBooleanFromString.parse('')).toBe(false);
  });

  it('parses an arbitrary string to false', () => {
    expect(toBooleanFromString.parse('anything')).toBe(false);
  });

  it('parses undefined to false', () => {
    expect(toBooleanFromString.parse(undefined)).toBe(false);
  });

  it('passes a native boolean through', () => {
    expect(toBooleanFromString.parse(true)).toBe(true);
    expect(toBooleanFromString.parse(false)).toBe(false);
  });

  it('never throws on primitive input', () => {
    expect(toBooleanFromString.safeParse('').success).toBe(true);
    expect(toBooleanFromString.safeParse(undefined).success).toBe(true);
  });
});
