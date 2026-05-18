/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimestampUs } from './get_timestamp_us';

describe('getTimestampUs', () => {
  it('returns timestamp.us when present', () => {
    expect(getTimestampUs({ timestamp: { us: 1672531200000000 } })).toBe(1672531200000000);
  });

  it('returns 0 when document is undefined', () => {
    expect(getTimestampUs(undefined)).toBe(0);
  });

  it('returns 0 when timestamp is undefined', () => {
    expect(getTimestampUs({} as any)).toBe(0);
  });

  it('returns 0 when timestamp.us is undefined', () => {
    expect(getTimestampUs({ timestamp: {} } as any)).toBe(0);
  });

  it('returns 0 when timestamp.us is not a finite number', () => {
    expect(getTimestampUs({ timestamp: { us: NaN } } as any)).toBe(0);
    expect(getTimestampUs({ timestamp: { us: Infinity } } as any)).toBe(0);
    expect(getTimestampUs({ timestamp: { us: 'string' } } as any)).toBe(0);
    expect(getTimestampUs({ timestamp: { us: null } } as any)).toBe(0);
  });

  it('returns value when is string with only numbers', () => {
    expect(getTimestampUs({ timestamp: { us: '1234567890' } } as any)).toBe(1234567890);
  });

  it('returns 0 when string not only numbers ', () => {
    expect(getTimestampUs({ timestamp: { us: '1234567890a' } } as any)).toBe(0);
  });
});
