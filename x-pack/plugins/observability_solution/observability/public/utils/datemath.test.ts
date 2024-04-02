/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidDatemath } from './datemath';

describe('isValidDatemath()', () => {
  it('Returns `false` for empty strings', () => {
    expect(isValidDatemath('')).toBe(false);
  });

  it('Returns `false` for invalid strings', () => {
    expect(isValidDatemath('wadus')).toBe(false);
    expect(isValidDatemath('nowww-')).toBe(false);
    expect(isValidDatemath('now-')).toBe(false);
    expect(isValidDatemath('now-1')).toBe(false);
    expect(isValidDatemath('now-1d/')).toBe(false);
  });

  it('Returns `true` for valid strings', () => {
    expect(isValidDatemath('now')).toBe(true);
    expect(isValidDatemath('now-1d')).toBe(true);
    expect(isValidDatemath('now-1d/d')).toBe(true);
    expect(isValidDatemath('2022-11-09T09:37:10.481Z')).toBe(true);
  });
});
