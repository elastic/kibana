/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offsetForKey } from './timeline_keyboard';

describe('offsetForKey', () => {
  const durationMs = 60_000;

  it.each([
    ['ArrowRight', 10_000, 15_000],
    ['ArrowUp', 10_000, 15_000],
    ['ArrowLeft', 10_000, 5_000],
    ['ArrowDown', 10_000, 5_000],
    ['PageUp', 10_000, 40_000],
    ['PageDown', 40_000, 10_000],
    ['Home', 10_000, 0],
    ['End', 10_000, 60_000],
  ])('%s from %d moves to %d', (key, offsetMs, expected) => {
    expect(offsetForKey({ key, offsetMs, durationMs })).toBe(expected);
  });

  it('clamps to the recording', () => {
    expect(offsetForKey({ key: 'ArrowLeft', offsetMs: 1_000, durationMs })).toBe(0);
    expect(offsetForKey({ key: 'PageUp', offsetMs: 50_000, durationMs })).toBe(60_000);
  });

  it('ignores other keys', () => {
    expect(offsetForKey({ key: 'a', offsetMs: 0, durationMs })).toBeUndefined();
    expect(offsetForKey({ key: 'Tab', offsetMs: 0, durationMs })).toBeUndefined();
  });
});
