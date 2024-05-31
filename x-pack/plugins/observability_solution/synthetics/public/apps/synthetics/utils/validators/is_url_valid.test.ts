/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUrlValid } from './is_url_valid';

describe('isUrlValid', () => {
  it('should return false for undefined', () => {
    expect(isUrlValid(undefined)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isUrlValid(null)).toBe(false);
  });

  it('should return false for non-URL strings', () => {
    expect(isUrlValid('not a url')).toBe(false);
  });
  it('should return false for non-URL empty strings', () => {
    expect(isUrlValid('')).toBe(false);
  });

  it('should return false for URLs with disallowed schemes', () => {
    expect(isUrlValid('ftp://example.com')).toBe(false);
  });

  it('should return true for URLs with allowed protocols', () => {
    expect(isUrlValid('http://example.com')).toBe(true);
    expect(isUrlValid('https://example.com')).toBe(true);
  });
});
