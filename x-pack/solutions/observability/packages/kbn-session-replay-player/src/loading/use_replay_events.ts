/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createEventUrlNeutralizer } from '../model/url_policy';
import type { PlayerAction, PlayerPhase } from '../model/player_state';
import { INITIAL_PLAYER_PHASE, playerReducer } from '../model/player_state';
import type { TimelineIndex } from '../model/timeline_index';
import type { ReplayEvent, ReplayRecording } from '../types';
import { ReplayEventsLoop } from './replay_events_loop';
import type { LoadedBatch } from './replay_events_loop';

export interface UseReplayEventsArgs {
  /** Identity of the recording. Loading restarts only when it changes. */
  sessionId: string;
  recording: ReplayRecording;
  allowedRemoteOrigins?: readonly string[];
  /** Receives each batch of events in order, before the phase reflects it. */
  onEvents: (events: readonly ReplayEvent[]) => void;
  sizeThresholdEvents?: number;
}

export interface UseReplayEventsResult {
  phase: PlayerPhase;
  dispatch: (action: PlayerAction) => void;
  /** Time index of the events loaded so far; `undefined` before loading starts. */
  getTimelineIndex: () => TimelineIndex | undefined;
  retry: () => void;
  continueLoading: () => void;
}

/**
 * Loads a recording page by page and tracks the player phase. The recording, the origin allowlist
 * and the callbacks are read when loading starts, so a host that re-renders with new closures does
 * not restart the player; only a different `sessionId` does.
 */
export const useReplayEvents = ({
  sessionId,
  recording,
  allowedRemoteOrigins,
  onEvents,
  sizeThresholdEvents,
}: UseReplayEventsArgs): UseReplayEventsResult => {
  const [phase, dispatch] = useReducer(playerReducer, INITIAL_PLAYER_PHASE);
  const loopRef = useRef<ReplayEventsLoop>();
  const latest = useRef({ recording, allowedRemoteOrigins, onEvents, sizeThresholdEvents });
  latest.current = { recording, allowedRemoteOrigins, onEvents, sizeThresholdEvents };

  useEffect(() => {
    dispatch({ type: 'reset' });
    const current = latest.current.recording;
    if (current.status === 'unavailable') {
      dispatch({ type: 'recordingUnavailable', reason: current.reason });
      return undefined;
    }

    const neutralize = createEventUrlNeutralizer({
      allowedOrigins: latest.current.allowedRemoteOrigins,
    });
    const loop = new ReplayEventsLoop({
      loadEvents: current.loadEvents,
      neutralize,
      sizeThresholdEvents: latest.current.sizeThresholdEvents,
      onBatch: (batch: LoadedBatch) => {
        if (batch.events.length > 0) {
          latest.current.onEvents(batch.events);
        }
        dispatch({
          type: 'pagesLoaded',
          playableCount: batch.playableCount,
          hasPlayablePrefix: batch.hasPlayablePrefix,
          complete: batch.complete,
          loadedEndMs: batch.loadedEndMs,
        });
      },
      onFailure: (error, hasPlayablePrefix) =>
        dispatch({ type: 'loadFailed', error, hasPlayablePrefix }),
      onStuck: () => dispatch({ type: 'loadingTruncated' }),
      onSizeThreshold: () => dispatch({ type: 'sizeThresholdReached' }),
    });
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.abort();
      if (loopRef.current === loop) {
        loopRef.current = undefined;
      }
    };
  }, [sessionId]);

  const retry = useCallback(() => {
    dispatch({ type: 'retry' });
    loopRef.current?.retry();
  }, []);

  const continueLoading = useCallback(() => {
    dispatch({ type: 'continueLoading' });
    loopRef.current?.continueLoading();
  }, []);

  const getTimelineIndex = useCallback(() => loopRef.current?.index, []);

  return { phase, dispatch, getTimelineIndex, retry, continueLoading };
};
