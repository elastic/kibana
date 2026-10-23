/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isReplayEvent } from '../model/replay_event_guards';
import type { ReplayEvent } from '../types';

/** Builds a typed event from a literal payload, failing the test if it is not a replay event. */
export const toReplayEvent = (payload: unknown): ReplayEvent => {
  if (!isReplayEvent(payload)) {
    throw new Error(`Not a replay event: ${JSON.stringify(payload)}`);
  }
  return payload;
};

export const T0 = 1_700_000_000_000;

export const metaEvent = (timestamp: number, href = 'https://shop.example/'): ReplayEvent =>
  toReplayEvent({ type: 4, timestamp, data: { href, width: 800, height: 600 } });

export const fullSnapshotEvent = (timestamp: number, childNodes: unknown[] = []): ReplayEvent =>
  toReplayEvent({
    type: 2,
    timestamp,
    data: {
      node: { type: 0, id: 1, childNodes, compatMode: 'CSS1Compat' },
      initialOffset: { top: 0, left: 0 },
    },
  });

export const mutationEvent = (timestamp: number, data: Record<string, unknown> = {}): ReplayEvent =>
  toReplayEvent({
    type: 3,
    timestamp,
    data: { source: 0, texts: [], attributes: [], removes: [], adds: [], ...data },
  });

export const clickEvent = (timestamp: number): ReplayEvent =>
  toReplayEvent({ type: 3, timestamp, data: { source: 2, type: 2, id: 1, x: 1, y: 1 } });

export const element = (
  id: number,
  tagName: string,
  attributes: Record<string, unknown> = {},
  childNodes: unknown[] = []
) => ({ type: 2, id, tagName, attributes, childNodes });

export const textNode = (id: number, textContent: string, isStyle = false) => ({
  type: 3,
  id,
  textContent,
  ...(isStyle ? { isStyle: true } : {}),
});
