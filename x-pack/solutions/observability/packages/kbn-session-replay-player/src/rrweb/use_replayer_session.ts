/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { MIN_PLAYABLE_EVENTS } from '../model/playable_events';
import type { ReplayEvent } from '../types';
import { createRrwebSessionFactory } from './replayer_session';
import { loadRrweb } from './load_rrweb';
import type { ReplayerSession, ReplayerSessionCallbacks, ReplayerSessionFactory } from './types';

/** Resolves the factory that creates sessions; the default loads rrweb on first use. */
export type LoadSessionFactory = () => Promise<ReplayerSessionFactory>;

export const loadRrwebSessionFactory: LoadSessionFactory = async () =>
  createRrwebSessionFactory(await loadRrweb());

export interface UseReplayerSessionArgs {
  /** Identity of the recording; the session is rebuilt when it changes. */
  sessionId: string;
  /** The element rrweb renders into, once it is attached. */
  root: HTMLElement | null;
  /** Whether enough has loaded to render a first frame. */
  ready: boolean;
  speed: number;
  /** Offset to show first. */
  initialOffsetMs?: number;
  callbacks: ReplayerSessionCallbacks;
  onSession: (session: ReplayerSession | undefined) => void;
  loadSessionFactory?: LoadSessionFactory;
}

export interface UseReplayerSessionResult {
  /** Receives every loaded event in order; they reach rrweb as soon as a session exists. */
  sink: { append: (events: readonly ReplayEvent[]) => void };
}

/**
 * Owns the lifetime of the rrweb session: it is created once the recording is ready and its mount
 * node exists, fed with events that arrived before and after, and destroyed on unmount or when the
 * session changes. rrweb itself is imported only when the first session is created.
 */
export const useReplayerSession = ({
  sessionId,
  root,
  ready,
  speed,
  initialOffsetMs = 0,
  callbacks,
  onSession,
  loadSessionFactory = loadRrwebSessionFactory,
}: UseReplayerSessionArgs): UseReplayerSessionResult => {
  const pending = useRef<ReplayEvent[]>([]);
  const sessionRef = useRef<ReplayerSession>();
  const latest = useRef({ speed, initialOffsetMs, callbacks, onSession, loadSessionFactory });
  latest.current = { speed, initialOffsetMs, callbacks, onSession, loadSessionFactory };

  useEffect(() => {
    pending.current = [];
    return () => {
      pending.current = [];
    };
  }, [sessionId]);

  useEffect(() => {
    if (!ready || !root) {
      return undefined;
    }
    let cancelled = false;
    let created: ReplayerSession | undefined;

    latest.current
      .loadSessionFactory()
      .then((factory) => {
        if (cancelled || pending.current.length < MIN_PLAYABLE_EVENTS) {
          return;
        }
        const initialEvents = pending.current;
        pending.current = [];
        created = factory({
          root,
          initialEvents,
          speed: latest.current.speed,
          callbacks: latest.current.callbacks,
        });
        sessionRef.current = created;
        created.pause(latest.current.initialOffsetMs);
        latest.current.onSession(created);
      })
      .catch(() => {
        // A failed import or construction leaves the player without a session; the host-visible
        // state stays what the loader reports.
      });

    return () => {
      cancelled = true;
      created?.destroy();
      if (sessionRef.current === created) {
        sessionRef.current = undefined;
      }
      latest.current.onSession(undefined);
    };
  }, [sessionId, ready, root]);

  const append = useCallback((events: readonly ReplayEvent[]) => {
    const session = sessionRef.current;
    if (session) {
      session.append(events);
    } else {
      pending.current.push(...events);
    }
  }, []);

  return { sink: { append } };
};
