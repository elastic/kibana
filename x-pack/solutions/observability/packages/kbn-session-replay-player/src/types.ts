/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { eventWithTime } from '@rrweb/types';

/** A single rrweb event as recorded in the browser. */
export type ReplayEvent = eventWithTime;

/** Opaque position in a recording's event stream; produced and interpreted only by the host. */
export type ReplayCursor = string;

export interface ReplayEventsRequest {
  /** Absent for the first page. */
  readonly cursor?: ReplayCursor;
  readonly signal: AbortSignal;
}

export interface ReplayEventsPage {
  /** Events in recording order; pages must not overlap. */
  readonly events: readonly ReplayEvent[];
  /** Absent when the recording has no further events. */
  readonly nextCursor?: ReplayCursor;
}

export type ReplayEventsLoader = (request: ReplayEventsRequest) => Promise<ReplayEventsPage>;

export type ReplayUnavailableReason = 'noRecording' | 'sampledOut' | 'pastRetention';

/**
 * Approximate bounds of the recording, known to the host before any event has loaded. The player
 * reconciles them with the timestamps of the events it receives.
 */
export interface ReplayRecordingMeta {
  /** Epoch milliseconds of the first replay event. */
  readonly startTimestamp: number;
  /** Epoch milliseconds of the last replay event. */
  readonly endTimestamp: number;
  readonly eventCount?: number;
}

export type ReplayRecording =
  | {
      readonly status: 'available';
      readonly loadEvents: ReplayEventsLoader;
      readonly meta?: ReplayRecordingMeta;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: ReplayUnavailableReason;
      /** Optional host action, for example a link back to the session. */
      readonly action?: ReactNode;
    };

export type ReplayMarkerKind = 'navigation' | 'error' | 'click';

export interface ReplayMarker {
  readonly id: string;
  readonly kind: ReplayMarkerKind;
  /** Epoch milliseconds on the recording browser's clock, the same clock as `ReplayEvent.timestamp`. */
  readonly timestamp: number;
  readonly label: string;
}

/** Why a position was reported. */
export type ReplayTimeUpdateReason = 'playing' | 'paused' | 'seeked' | 'ended';

export interface SessionReplayPlayerProps {
  /** Identity of the recording; changing it resets the player. */
  readonly sessionId: string;
  readonly recording: ReplayRecording;
  readonly markers?: readonly ReplayMarker[];
  /**
   * Origins from which recorded content may load images. Every other remote URL in the recording
   * is neutralised. Supply origins from trusted configuration, not from recorded data.
   */
  readonly allowedRemoteOrigins?: readonly string[];
  readonly initialOffsetMs?: number;
  /** Throttled while playing; reported once for every pause, seek and end. */
  readonly onTimeUpdate?: (offsetMs: number, reason: ReplayTimeUpdateReason) => void;
  readonly 'data-test-subj'?: string;
}

/** What a thumbnail is drawn from; produced by `extractThumbnailSnapshot`. */
export interface ReplayThumbnailSnapshot {
  readonly viewport: { readonly width: number; readonly height: number };
  /** The first full snapshot of the recording. */
  readonly fullSnapshot: ReplayEvent;
}

export interface SessionReplayThumbnailProps {
  /** Absent while the host has not loaded it, or when the recording has none; a placeholder shows. */
  readonly snapshot?: ReplayThumbnailSnapshot;
  readonly width?: number;
  readonly height?: number;
  /** Origins from which the recorded page may load images; see `SessionReplayPlayerProps`. */
  readonly allowedRemoteOrigins?: readonly string[];
  readonly 'aria-label'?: string;
  readonly 'data-test-subj'?: string;
}

export interface SessionReplayPlayerHandle {
  seek: (offsetMs: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentOffsetMs: () => number;
}
