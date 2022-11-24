/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateIndexPattern } from './validate_index_pattern';

describe('validateIndexPattern', () => {
  test('should return true if the value is a valid settings index pattern', () => {
    expect(validateIndexPattern('logs-*')).toBe(true);
    expect(validateIndexPattern('logs-*,filebeat-*')).toBe(true);
  });

  test('should return false if the index pattern is an empty string', () => {
    expect(validateIndexPattern('')).toBe(false);
  });

  test('should return false if the index pattern contains empty spaces', () => {
    expect(validateIndexPattern(' ')).toBe(false);
    expect(validateIndexPattern(' logs-*')).toBe(false);
    expect(validateIndexPattern('logs-* ')).toBe(false);
    expect(validateIndexPattern('logs-*, filebeat-*')).toBe(false);
  });

  test('should return false if the index pattern contains empty comma-separated entries', () => {
    expect(validateIndexPattern(',logs-*')).toBe(false);
    expect(validateIndexPattern('logs-*,')).toBe(false);
    expect(validateIndexPattern('logs-*,,filebeat-*')).toBe(false);
    expect(validateIndexPattern('logs-*,,,filebeat-*')).toBe(false);
  });
});
