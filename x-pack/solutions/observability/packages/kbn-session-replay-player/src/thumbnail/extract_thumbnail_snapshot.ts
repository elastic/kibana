/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFullSnapshotEvent, isMetaEvent } from '../model/replay_event_guards';
import type { ReplayEvent, ReplayThumbnailSnapshot } from '../types';

/**
 * Picks what a thumbnail needs from the start of a recording: the recorded viewport and the first
 * full snapshot. Returns `undefined` when either is missing, so a host can show a placeholder.
 */
export const extractThumbnailSnapshot = (
  events: readonly ReplayEvent[]
): ReplayThumbnailSnapshot | undefined => {
  const meta = events.find(isMetaEvent);
  const fullSnapshot = events.find(isFullSnapshotEvent);
  if (!meta || !fullSnapshot) {
    return undefined;
  }
  const { width, height } = meta.data;
  if (!(width > 0) || !(height > 0)) {
    return undefined;
  }
  return { viewport: { width, height }, fullSnapshot };
};
