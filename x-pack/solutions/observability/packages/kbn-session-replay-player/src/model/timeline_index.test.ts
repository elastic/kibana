/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineIndex } from './timeline_index';

describe('TimelineIndex', () => {
  it('is empty until timestamps are added', () => {
    const index = new TimelineIndex();

    expect(index.size).toBe(0);
    expect(index.startTimestamp).toBeUndefined();
    expect(index.endTimestamp).toBeUndefined();
    expect(index.durationMs).toBe(0);
    expect(index.firstTimestampAfter(0)).toBeUndefined();
  });

  it('tracks start, end and duration across appended pages', () => {
    const index = new TimelineIndex();

    index.add([100, 200]);
    expect(index.durationMs).toBe(100);

    index.add([300, 5_100]);
    expect(index.startTimestamp).toBe(100);
    expect(index.endTimestamp).toBe(5_100);
    expect(index.durationMs).toBe(5_000);
    expect(index.size).toBe(4);
  });

  it('keeps timestamps sorted when a page arrives out of order or overlaps earlier events', () => {
    const index = new TimelineIndex();

    index.add([100, 400]);
    index.add([300, 200]);

    expect(index.firstTimestampAfter(150)).toBe(200);
    expect(index.firstTimestampAfter(250)).toBe(300);
    expect(index.firstTimestampAfter(350)).toBe(400);
  });

  it('ignores empty pages', () => {
    const index = new TimelineIndex();

    index.add([]);

    expect(index.size).toBe(0);
  });

  describe('firstTimestampAfter', () => {
    const index = new TimelineIndex();
    index.add([10, 20, 20, 30]);

    it.each([
      [5, 10],
      [10, 20],
      [20, 30],
      [25, 30],
      [30, undefined],
      [99, undefined],
    ])('returns the first timestamp strictly after %d', (timestamp, expected) => {
      expect(index.firstTimestampAfter(timestamp)).toBe(expected);
    });
  });
});
