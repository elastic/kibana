/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayEvent } from '../types';
import { isFullSnapshotEvent, isMetaEvent } from './replay_event_guards';

/** rrweb throws when it is given fewer events than this (outside live mode). */
export const MIN_PLAYABLE_EVENTS = 2;

/** Orders events by time, keeping the recorded order of events with equal timestamps. */
export const sortByTimestamp = (events: readonly ReplayEvent[]): ReplayEvent[] =>
  [...events].sort((a, b) => a.timestamp - b.timestamp);

/** Whether the events are enough to render a first frame: a viewport, a snapshot and one more event. */
export const hasPlayablePrefix = (events: readonly ReplayEvent[]): boolean =>
  events.length >= MIN_PLAYABLE_EVENTS &&
  events.some(isMetaEvent) &&
  events.some(isFullSnapshotEvent);

export type FinishedRecording = 'empty' | 'incomplete' | 'playable';

/** Classifies a recording once the loader has delivered every page. */
export const classifyFinishedRecording = (events: readonly ReplayEvent[]): FinishedRecording => {
  if (events.length === 0) {
    return 'empty';
  }
  return hasPlayablePrefix(events) ? 'playable' : 'incomplete';
};
