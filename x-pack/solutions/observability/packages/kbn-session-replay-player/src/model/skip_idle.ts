/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineIndex } from './timeline_index';

/** Quiet stretch before skip idle jumps to the next recorded event. */
export const SKIP_IDLE_THRESHOLD_MS = 2_000;

/**
 * Offset to seek to when skip idle is on: the next recorded event when the playhead sits in a gap
 * longer than the threshold. Returns `undefined` when there is nothing to skip, or when the next
 * event has not been loaded yet. rrweb's own `skipInactive` needs pointer events, which these
 * recordings often lack.
 */
export const nextSkipIdleOffsetMs = ({
  index,
  currentOffsetMs,
  thresholdMs = SKIP_IDLE_THRESHOLD_MS,
}: {
  index: TimelineIndex;
  currentOffsetMs: number;
  thresholdMs?: number;
}): number | undefined => {
  const start = index.startTimestamp;
  if (start === undefined || !Number.isFinite(currentOffsetMs) || currentOffsetMs < 0) {
    return undefined;
  }
  const currentTimestamp = start + currentOffsetMs;
  const next = index.firstTimestampAfter(currentTimestamp);
  if (next === undefined || next - currentTimestamp <= thresholdMs) {
    return undefined;
  }
  return next - start;
};
