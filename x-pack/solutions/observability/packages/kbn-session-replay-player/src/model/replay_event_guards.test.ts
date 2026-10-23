/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickEvent, fullSnapshotEvent, metaEvent, T0 } from '../test_helpers/replay_events';
import {
  isFullSnapshotEvent,
  isMetaEvent,
  isReplayEvent,
  parseReplayEvents,
} from './replay_event_guards';

describe('replay event guards', () => {
  describe('isReplayEvent', () => {
    it.each([
      ['a meta event', { type: 4, timestamp: 1, data: {} }],
      ['an asset event', { type: 7, timestamp: 1, data: {} }],
      ['a dom content loaded event', { type: 0, timestamp: 1, data: {} }],
    ])('accepts %s', (_name, value) => {
      expect(isReplayEvent(value)).toBe(true);
    });

    it.each([
      ['the synthetic marker type 99', { type: 99, timestamp: 1, data: {} }],
      ['a negative type', { type: -1, timestamp: 1, data: {} }],
      ['a missing timestamp', { type: 4, data: {} }],
      ['a non-finite timestamp', { type: 4, timestamp: Infinity, data: {} }],
      ['a string timestamp', { type: 4, timestamp: '1', data: {} }],
      ['a missing data field', { type: 4, timestamp: 1 }],
      ['a string', 'event'],
      ['null', null],
      ['undefined', undefined],
    ])('rejects %s', (_name, value) => {
      expect(isReplayEvent(value)).toBe(false);
    });
  });

  describe('parseReplayEvents', () => {
    it('keeps replay events in order and drops everything else', () => {
      const parsed = parseReplayEvents([
        { type: 4, timestamp: 1, data: { href: 'a' } },
        { type: 99, timestamp: 2, data: { name: 'replay-started' } },
        'noise',
        { type: 2, timestamp: 3, data: {} },
      ]);

      expect(parsed.map(({ type }) => type)).toEqual([4, 2]);
    });

    it('returns an empty array for non-arrays', () => {
      expect(parseReplayEvents({ type: 4 })).toEqual([]);
      expect(parseReplayEvents(undefined)).toEqual([]);
    });
  });

  it('discriminates meta and full snapshot events', () => {
    expect(isMetaEvent(metaEvent(T0))).toBe(true);
    expect(isMetaEvent(fullSnapshotEvent(T0))).toBe(false);
    expect(isFullSnapshotEvent(fullSnapshotEvent(T0))).toBe(true);
    expect(isFullSnapshotEvent(clickEvent(T0))).toBe(false);
  });
});
