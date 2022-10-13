/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from './format';
describe('formatDuration', () => {
  it('returns zero for < 1 millisecond', () => {
    expect(formatDuration(984)).toBe('0 ms');
  });

  it('returns milliseconds string if < 1 seconds', () => {
    expect(formatDuration(921_039)).toBe('921 ms');
  });

  it('returns s string for seconds', () => {
    expect(formatDuration(1_032_100)).toBe('1 s');
  });
});
