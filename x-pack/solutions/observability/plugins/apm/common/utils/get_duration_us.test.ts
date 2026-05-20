/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionDurationUs, getSpanDurationUs } from './get_duration_us';

describe('getTransactionDurationUs', () => {
  it('returns transaction.duration.us when present', () => {
    expect(getTransactionDurationUs({ transaction: { duration: { us: 1500000 } } })).toBe(1500000);
  });

  it('returns 0 when document is undefined', () => {
    expect(getTransactionDurationUs(undefined)).toBe(0);
  });

  it('returns 0 when transaction is undefined', () => {
    expect(getTransactionDurationUs({} as any)).toBe(0);
  });

  it('returns 0 when transaction.duration is undefined', () => {
    expect(getTransactionDurationUs({ transaction: {} } as any)).toBe(0);
  });

  it('returns 0 when transaction.duration.us is undefined', () => {
    expect(getTransactionDurationUs({ transaction: { duration: {} } } as any)).toBe(0);
  });

  it('returns 0 when transaction.duration.us is not a finite number', () => {
    expect(getTransactionDurationUs({ transaction: { duration: { us: NaN } } } as any)).toBe(0);
    expect(getTransactionDurationUs({ transaction: { duration: { us: Infinity } } } as any)).toBe(
      0
    );
    expect(getTransactionDurationUs({ transaction: { duration: { us: 'string' } } } as any)).toBe(
      0
    );
    expect(getTransactionDurationUs({ transaction: { duration: { us: null } } } as any)).toBe(0);
  });

  it('returns value when is string with only numbers', () => {
    expect(
      getTransactionDurationUs({ transaction: { duration: { us: '1234567890' } } } as any)
    ).toBe(1234567890);
  });

  it('returns 0 when string not only numbers', () => {
    expect(
      getTransactionDurationUs({ transaction: { duration: { us: '1234567890a' } } } as any)
    ).toBe(0);
  });
});

describe('getSpanDurationUs', () => {
  it('returns span.duration.us when present', () => {
    expect(getSpanDurationUs({ span: { duration: { us: 250000 } } })).toBe(250000);
  });

  it('returns 0 when document is undefined', () => {
    expect(getSpanDurationUs(undefined)).toBe(0);
  });

  it('returns 0 when span is undefined', () => {
    expect(getSpanDurationUs({} as any)).toBe(0);
  });

  it('returns 0 when span.duration is undefined', () => {
    expect(getSpanDurationUs({ span: {} } as any)).toBe(0);
  });

  it('returns 0 when span.duration.us is undefined', () => {
    expect(getSpanDurationUs({ span: { duration: {} } } as any)).toBe(0);
  });

  it('returns 0 when span.duration.us is not a finite number', () => {
    expect(getSpanDurationUs({ span: { duration: { us: NaN } } } as any)).toBe(0);
    expect(getSpanDurationUs({ span: { duration: { us: Infinity } } } as any)).toBe(0);
    expect(getSpanDurationUs({ span: { duration: { us: 'string' } } } as any)).toBe(0);
    expect(getSpanDurationUs({ span: { duration: { us: null } } } as any)).toBe(0);
  });

  it('returns value when is string with only numbers', () => {
    expect(getSpanDurationUs({ span: { duration: { us: '1234567890' } } } as any)).toBe(1234567890);
  });

  it('returns 0 when string not only numbers', () => {
    expect(getSpanDurationUs({ span: { duration: { us: '1234567890a' } } } as any)).toBe(0);
  });
});
