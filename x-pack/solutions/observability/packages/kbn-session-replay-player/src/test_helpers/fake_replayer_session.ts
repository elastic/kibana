/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayEvent } from '../types';
import type {
  CreateReplayerSessionArgs,
  ReplayerSession,
  ReplayerSessionFactory,
} from '../rrweb/types';

export interface FakeReplayerSession extends ReplayerSession {
  readonly calls: string[];
  readonly appended: ReplayEvent[];
  readonly speed: () => number;
  readonly destroyed: () => boolean;
  /** Moves the playhead as the passing of time would while playing. */
  advanceTo: (offsetMs: number) => void;
  /** Triggers the end-of-playback callback as rrweb would. */
  finish: () => void;
}

/**
 * A double for the rrweb adapter that models the behaviours the player depends on: it refuses
 * fewer than two events, learns the viewport from the first viewport event, extends its duration
 * asynchronously after an append, ignores calls after `destroy`, and can be destroyed twice.
 */
export const createFakeSessionFactory = (): {
  factory: ReplayerSessionFactory;
  sessions: FakeReplayerSession[];
} => {
  const sessions: FakeReplayerSession[] = [];

  const factory: ReplayerSessionFactory = ({
    root,
    initialEvents,
    speed,
    callbacks,
  }: CreateReplayerSessionArgs) => {
    if (initialEvents.length < 2) {
      throw new Error('Replayer need at least 2 events.');
    }
    const timestamps = initialEvents.map(({ timestamp }) => timestamp);
    const first = timestamps[0];
    let durationMs = Math.max(...timestamps) - first;
    let offsetMs = 0;
    let currentSpeed = speed;
    let isDestroyed = false;
    const calls: string[] = [];
    const appended: ReplayEvent[] = [];
    const wrapper = root.ownerDocument.createElement('div');
    wrapper.className = 'replayer-wrapper';
    wrapper.appendChild(root.ownerDocument.createElement('iframe'));
    root.appendChild(wrapper);

    const meta = initialEvents.find((event) => event.type === 4);
    if (meta && meta.type === 4) {
      callbacks.onViewportChange({ width: meta.data.width, height: meta.data.height });
    }

    const session: FakeReplayerSession = {
      calls,
      appended,
      speed: () => currentSpeed,
      destroyed: () => isDestroyed,
      advanceTo: (offset) => {
        offsetMs = offset;
      },
      finish: () => callbacks.onFinish(),
      append: (events) => {
        if (isDestroyed) {
          return;
        }
        calls.push(`append:${events.length}`);
        appended.push(...events);
        const latest = Math.max(...events.map(({ timestamp }) => timestamp));
        // rrweb applies appended events in a microtask, so its duration lags behind the call.
        void Promise.resolve().then(() => {
          durationMs = Math.max(durationMs, latest - first);
        });
      },
      play: (offset) => {
        if (!isDestroyed) {
          calls.push(`play:${offset}`);
          offsetMs = offset;
        }
      },
      pause: (offset) => {
        if (!isDestroyed) {
          calls.push(`pause:${offset}`);
          offsetMs = offset;
        }
      },
      setSpeed: (nextSpeed) => {
        if (!isDestroyed) {
          calls.push(`speed:${nextSpeed}`);
          currentSpeed = nextSpeed;
        }
      },
      getCurrentOffsetMs: () => offsetMs,
      getDurationMs: () => durationMs,
      getWrapper: () => (isDestroyed ? undefined : wrapper),
      destroy: () => {
        if (!isDestroyed) {
          isDestroyed = true;
          wrapper.remove();
        }
      },
    };
    sessions.push(session);
    return session;
  };

  return { factory, sessions };
};
