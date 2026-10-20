/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clickEvent,
  fullSnapshotEvent,
  metaEvent,
  mutationEvent,
  T0,
} from '../test_helpers/replay_events';
import {
  classifyFinishedRecording,
  hasPlayablePrefix,
  MIN_PLAYABLE_EVENTS,
  sortByTimestamp,
} from './playable_events';

describe('playable events', () => {
  it('sorts by timestamp and keeps recorded order for equal timestamps', () => {
    const first = mutationEvent(T0 + 10, { marker: 'first' });
    const second = mutationEvent(T0 + 10, { marker: 'second' });
    const earlier = metaEvent(T0);

    expect(sortByTimestamp([first, second, earlier])).toEqual([earlier, first, second]);
  });

  it('does not mutate its input', () => {
    const events = [clickEvent(T0 + 5), metaEvent(T0)];

    sortByTimestamp(events);

    expect(events.map(({ timestamp }) => timestamp)).toEqual([T0 + 5, T0]);
  });

  describe('hasPlayablePrefix', () => {
    it('needs a viewport, a snapshot and at least the minimum number of events', () => {
      expect(MIN_PLAYABLE_EVENTS).toBe(2);
      expect(hasPlayablePrefix([metaEvent(T0), fullSnapshotEvent(T0 + 1)])).toBe(true);
    });

    it.each([
      ['no events', []],
      ['a single event', [metaEvent(T0)]],
      ['no full snapshot', [metaEvent(T0), clickEvent(T0 + 1)]],
      ['no meta event', [fullSnapshotEvent(T0), clickEvent(T0 + 1)]],
    ])('is false for %s', (_name, events) => {
      expect(hasPlayablePrefix(events)).toBe(false);
    });
  });

  describe('classifyFinishedRecording', () => {
    it('classifies empty, incomplete and playable recordings', () => {
      expect(classifyFinishedRecording([])).toBe('empty');
      expect(classifyFinishedRecording([metaEvent(T0)])).toBe('incomplete');
      expect(classifyFinishedRecording([metaEvent(T0), fullSnapshotEvent(T0 + 1)])).toBe(
        'playable'
      );
    });
  });
});
