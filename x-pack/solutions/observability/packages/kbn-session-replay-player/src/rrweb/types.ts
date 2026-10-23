/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayEvent } from '../types';

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface ReplayerSessionCallbacks {
  /** Playback reached the end of the events loaded so far. */
  onFinish: () => void;
  /** The recorded viewport changed size. */
  onViewportChange: (size: ViewportSize) => void;
}

/** What the player needs from rrweb. The real adapter wraps rrweb's `Replayer`; tests use a double. */
export interface ReplayerSession {
  /** Hands later events to a running replayer; events must be in time order. */
  append: (events: readonly ReplayEvent[]) => void;
  /** Starts playing from an offset in milliseconds since the first event. */
  play: (offsetMs: number) => void;
  /** Shows the frame at an offset and stops. */
  pause: (offsetMs: number) => void;
  setSpeed: (speed: number) => void;
  getCurrentOffsetMs: () => number;
  /** Milliseconds between the first and the last event the replayer knows about. */
  getDurationMs: () => number;
  /** The element rrweb positions the recorded page in; the stage scales it. */
  getWrapper: () => HTMLElement | undefined;
  /** Safe to call more than once. */
  destroy: () => void;
}

export interface CreateReplayerSessionArgs {
  /** An attached element rrweb renders into. */
  root: HTMLElement;
  /** At least the first viewport event, a full snapshot and one more event. */
  initialEvents: readonly ReplayEvent[];
  speed: number;
  callbacks: ReplayerSessionCallbacks;
}

export type ReplayerSessionFactory = (args: CreateReplayerSessionArgs) => ReplayerSession;
