/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from './format_duration';

describe('formatDuration(seconds)', () => {
  it('should work for less than a minute', () => {
    expect(formatDuration(56)).toBe('56s');
  });

  it('should work for less than a hour', () => {
    expect(formatDuration(2000)).toBe('33m 20s');
  });

  it('should work for less than a day', () => {
    expect(formatDuration(74566)).toBe('20h 42m');
  });

  it('should work for more than a day', () => {
    expect(formatDuration(86400 * 3 + 3600 * 4)).toBe('3d 4h');
    expect(formatDuration(86400 * 419 + 3600 * 6)).toBe('419d 6h');
  });
});
