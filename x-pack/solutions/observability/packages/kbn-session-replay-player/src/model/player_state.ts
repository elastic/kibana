/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayUnavailableReason } from '../types';

export type PlaybackState = 'paused' | 'playing' | 'buffering' | 'ended';

/**
 * `more`: pages are still arriving. `awaitingContinue`: the size threshold was reached and the user
 * decides whether to keep loading. `truncated`: loading stopped before the recording ended.
 */
export type LoadingState = 'more' | 'complete' | 'failed' | 'truncated' | 'awaitingContinue';

export type PlayerPhase =
  | { readonly kind: 'unavailable'; readonly reason: ReplayUnavailableReason }
  | { readonly kind: 'loading' }
  | { readonly kind: 'incomplete'; readonly playableCount: number }
  | { readonly kind: 'failed'; readonly error: Error }
  | {
      readonly kind: 'ready';
      readonly playback: PlaybackState;
      readonly loading: LoadingState;
      /** Offset the user asked for while it was not loaded yet; set while buffering. */
      readonly seekTargetMs?: number;
    };

export type PlayerAction =
  | { type: 'reset' }
  | { type: 'recordingUnavailable'; reason: ReplayUnavailableReason }
  | {
      type: 'pagesLoaded';
      playableCount: number;
      hasPlayablePrefix: boolean;
      /** The loader delivered its last page. */
      complete: boolean;
      /** Offset of the last loaded event, if any. */
      loadedEndMs: number | undefined;
    }
  | { type: 'loadFailed'; error: Error; hasPlayablePrefix: boolean }
  | { type: 'loadingTruncated' }
  | { type: 'sizeThresholdReached' }
  | { type: 'continueLoading' }
  | { type: 'retry' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; offsetMs: number; loadedEndMs: number | undefined }
  | { type: 'finished' };

export const INITIAL_PLAYER_PHASE: PlayerPhase = { kind: 'loading' };

type ReadyPhase = Extract<PlayerPhase, { kind: 'ready' }>;

const isLoadingMore = (loading: LoadingState): boolean => loading === 'more';

/** Ends a buffering seek whose target will not arrive: loading stopped short of it. */
const settleBuffering = (phase: ReadyPhase, loadedEndMs: number | undefined): ReadyPhase => {
  if (phase.playback !== 'buffering' || phase.loading === 'awaitingContinue') {
    return phase;
  }
  const { seekTargetMs } = phase;
  const targetLoaded =
    seekTargetMs !== undefined && loadedEndMs !== undefined && loadedEndMs >= seekTargetMs;
  if (targetLoaded) {
    return { ...phase, playback: 'playing', seekTargetMs: undefined };
  }
  return isLoadingMore(phase.loading)
    ? phase
    : { ...phase, playback: 'paused', seekTargetMs: undefined };
};

const withLoading = (phase: ReadyPhase, loading: LoadingState): ReadyPhase => ({
  ...phase,
  loading,
});

export const playerReducer = (phase: PlayerPhase, action: PlayerAction): PlayerPhase => {
  switch (action.type) {
    case 'reset':
      return INITIAL_PLAYER_PHASE;

    case 'recordingUnavailable':
      return { kind: 'unavailable', reason: action.reason };

    case 'pagesLoaded': {
      if (phase.kind === 'ready') {
        const loading: LoadingState = action.complete ? 'complete' : phase.loading;
        const next = loading === phase.loading ? phase : withLoading(phase, loading);
        return settleBuffering(next, action.loadedEndMs);
      }
      if (phase.kind !== 'loading' && phase.kind !== 'incomplete') {
        return phase;
      }
      if (action.hasPlayablePrefix) {
        return {
          kind: 'ready',
          playback: 'paused',
          loading: action.complete ? 'complete' : 'more',
        };
      }
      if (!action.complete) {
        return phase;
      }
      return action.playableCount === 0
        ? { kind: 'unavailable', reason: 'noRecording' }
        : { kind: 'incomplete', playableCount: action.playableCount };
    }

    case 'loadFailed':
      if (phase.kind === 'ready') {
        return settleBuffering(withLoading(phase, 'failed'), undefined);
      }
      return action.hasPlayablePrefix ? phase : { kind: 'failed', error: action.error };

    case 'loadingTruncated':
      return phase.kind === 'ready'
        ? settleBuffering(withLoading(phase, 'truncated'), undefined)
        : phase;

    case 'sizeThresholdReached':
      return phase.kind === 'ready' && isLoadingMore(phase.loading)
        ? withLoading(phase, 'awaitingContinue')
        : phase;

    case 'continueLoading':
      return phase.kind === 'ready' && phase.loading === 'awaitingContinue'
        ? withLoading(phase, 'more')
        : phase;

    case 'retry':
      if (phase.kind === 'failed') {
        return INITIAL_PLAYER_PHASE;
      }
      return phase.kind === 'ready' && phase.loading === 'failed'
        ? withLoading(phase, 'more')
        : phase;

    case 'play':
      return phase.kind === 'ready' && phase.playback !== 'buffering'
        ? { ...phase, playback: 'playing', seekTargetMs: undefined }
        : phase;

    case 'pause':
      return phase.kind === 'ready' && phase.playback !== 'ended'
        ? { ...phase, playback: 'paused', seekTargetMs: undefined }
        : phase;

    case 'seek': {
      if (phase.kind !== 'ready') {
        return phase;
      }
      const beyondLoaded = action.loadedEndMs === undefined || action.offsetMs > action.loadedEndMs;
      if (beyondLoaded && (isLoadingMore(phase.loading) || phase.loading === 'awaitingContinue')) {
        return { ...phase, playback: 'buffering', seekTargetMs: action.offsetMs };
      }
      return {
        ...phase,
        playback:
          phase.playback === 'ended' || phase.playback === 'buffering' ? 'paused' : phase.playback,
        seekTargetMs: undefined,
      };
    }

    case 'finished':
      return phase.kind === 'ready'
        ? { ...phase, playback: 'ended', seekTargetMs: undefined }
        : phase;

    default:
      return phase;
  }
};
