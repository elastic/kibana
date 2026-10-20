/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nextSkipIdleOffsetMs, SKIP_IDLE_THRESHOLD_MS } from './skip_idle';
import { TimelineIndex } from './timeline_index';

const indexOf = (...timestamps: number[]): TimelineIndex => {
  const index = new TimelineIndex();
  index.add(timestamps);
  return index;
};

describe('nextSkipIdleOffsetMs', () => {
  it('jumps to the next event when the gap exceeds the threshold', () => {
    const index = indexOf(1_000, 1_500, 11_500);

    expect(nextSkipIdleOffsetMs({ index, currentOffsetMs: 600 })).toBe(10_500);
  });

  it('does not skip a gap at or below the threshold', () => {
    const index = indexOf(0, SKIP_IDLE_THRESHOLD_MS);

    expect(nextSkipIdleOffsetMs({ index, currentOffsetMs: 0 })).toBeUndefined();
  });

  it('honours a custom threshold', () => {
    const index = indexOf(0, 600);

    expect(nextSkipIdleOffsetMs({ index, currentOffsetMs: 0, thresholdMs: 500 })).toBe(600);
  });

  it('returns nothing past the last loaded event', () => {
    const index = indexOf(0, 100);

    expect(nextSkipIdleOffsetMs({ index, currentOffsetMs: 100 })).toBeUndefined();
    expect(nextSkipIdleOffsetMs({ index, currentOffsetMs: 5_000 })).toBeUndefined();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns nothing for an invalid offset (%s)',
    (currentOffsetMs) => {
      expect(nextSkipIdleOffsetMs({ index: indexOf(0, 10_000), currentOffsetMs })).toBeUndefined();
    }
  );

  it('returns nothing for an empty index', () => {
    expect(
      nextSkipIdleOffsetMs({ index: new TimelineIndex(), currentOffsetMs: 0 })
    ).toBeUndefined();
  });
});
