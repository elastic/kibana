/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatDuration } from '../format_duration';

describe('formatDuration', () => {
  it('returns 0 for undefined', () => {
    const result = formatDuration(undefined);
    expect(result).toEqual(0);
  });

  it('returns 0 for NaN', () => {
    const result = formatDuration(NaN);
    expect(result).toEqual(0);
  });

  it('returns duration value in ms', () => {
    const duration = 320000; // microseconds
    expect(formatDuration(duration)).toEqual(320);
  });
});
