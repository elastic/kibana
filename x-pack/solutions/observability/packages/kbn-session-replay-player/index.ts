/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export { deriveReplayMarkers } from './src/model/derive_markers';
export { extractThumbnailSnapshot } from './src/thumbnail/extract_thumbnail_snapshot';
export type {
  ReplayCursor,
  ReplayEvent,
  ReplayEventsLoader,
  ReplayEventsPage,
  ReplayEventsRequest,
  ReplayMarker,
  ReplayMarkerKind,
  ReplayRecording,
  ReplayRecordingMeta,
  ReplayThumbnailSnapshot,
  ReplayTimeUpdateReason,
  ReplayUnavailableReason,
  SessionReplayPlayerHandle,
  SessionReplayPlayerProps,
  SessionReplayThumbnailProps,
} from './src/types';

/**
 * Lazily loaded so that importing the package does not pull the player, rrweb or EUI into a
 * consumer's bundle until the component is rendered inside a `Suspense` boundary.
 */
export const SessionReplayPlayer = lazy(() =>
  import('./src/session_replay_player').then((module) => ({
    default: module.SessionReplayPlayer,
  }))
);

/**
 * A still picture of the first frame of a recording, for lists. Lazily loaded like the player, and
 * drawn only once it scrolls into view.
 */
export const SessionReplayThumbnail = lazy(() =>
  import('./src/thumbnail/session_replay_thumbnail').then((module) => ({
    default: module.SessionReplayThumbnail,
  }))
);
