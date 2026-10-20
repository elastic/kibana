/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType } from '@rrweb/types';
import type { ReplayEvent } from '../types';

type EventOfType<TType extends EventType> = Extract<ReplayEvent, { type: TType }>;

/**
 * Whether a value is a recorded rrweb event. The stored stream also carries events that rrweb does
 * not understand (the recorder emits a synthetic type `99` marker); those are not replay events.
 */
export const isReplayEvent = (value: unknown): value is ReplayEvent =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'number' &&
  value.type >= EventType.DomContentLoaded &&
  value.type <= EventType.Asset &&
  'timestamp' in value &&
  typeof value.timestamp === 'number' &&
  Number.isFinite(value.timestamp) &&
  'data' in value;

/** Keeps the replay events of a parsed JSON array and drops everything else. */
export const parseReplayEvents = (value: unknown): ReplayEvent[] =>
  Array.isArray(value) ? value.filter(isReplayEvent) : [];

export const isMetaEvent = (event: ReplayEvent): event is EventOfType<EventType.Meta> =>
  event.type === EventType.Meta;

export const isFullSnapshotEvent = (
  event: ReplayEvent
): event is EventOfType<EventType.FullSnapshot> => event.type === EventType.FullSnapshot;
