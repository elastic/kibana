/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidKeyword } from './is_valid_keyword';

describe('isValidDateType', () => {
  it('should not validate a string of length less than 32766 bytes', () => {
    expect(isValidKeyword('')).toBe(true);
    expect(isValidKeyword('hello')).toBe(true);
    expect(isValidKeyword('hello world!')).toBe(true);
    expect(isValidKeyword('😀'.repeat(Math.floor(32767 / 4)))).toBe(true);
  });
  it('should validate a string of length 32766 bytes', () => {
    expect(isValidKeyword('z'.repeat(32766))).toBe(true);
  });
  it('should not validate a string of length more than 32766 bytes', () => {
    expect(isValidKeyword('z'.repeat(32767))).toBe(false);
    expect(isValidKeyword('😀'.repeat(Math.ceil(32767 / 4)))).toBe(false);
  });
  it('should validate a string of any length when `ignore_above` parameter is specified', () => {
    expect(isValidKeyword('z'.repeat(100), 1024)).toBe(true);
    expect(isValidKeyword('z'.repeat(32766), 1024)).toBe(true);
    expect(isValidKeyword('z'.repeat(100000), 1024)).toBe(true);
  });
});
