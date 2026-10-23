/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import { EuiProgress } from '@elastic/eui';
import { DEFAULT_PLAYBACK_SPEED } from './components/playback_speeds';
import { PlayerControls } from './components/player_controls';
import { PlayerStage } from './components/player_stage';
import { LoadingNoticeCallout, StatePrompt } from './components/state_prompt';
import type { LoadingNotice, StagePrompt } from './components/state_prompt';
import { Timeline } from './components/timeline';
import { usePlayingClock } from './components/use_playing_clock';
import { useReplayEvents } from './loading/use_replay_events';
import { nextSkipIdleOffsetMs } from './model/skip_idle';
import type { Size } from './model/stage_fit';
import { useReplayerSession } from './rrweb/use_replayer_session';
import type { LoadSessionFactory } from './rrweb/use_replayer_session';
import type { ReplayerSession, ReplayerSessionCallbacks } from './rrweb/types';
import { PLAYER_ARIA_LABEL, STAGE_ARIA_LABEL } from './translations';
import type { ReplayEvent, SessionReplayPlayerHandle, SessionReplayPlayerProps } from './types';

/** Seams the tests use to run the player without rrweb or with small thresholds. */
export interface SessionReplayPlayerInternals {
  loadSessionFactory?: LoadSessionFactory;
  sizeThresholdEvents?: number;
}

type SessionReplayPlayerViewProps = SessionReplayPlayerProps & {
  internals?: SessionReplayPlayerInternals;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const SessionReplayPlayerView = forwardRef<SessionReplayPlayerHandle, SessionReplayPlayerViewProps>(
  function SessionReplayPlayerView(
    {
      sessionId,
      recording,
      markers,
      allowedRemoteOrigins,
      initialOffsetMs,
      onTimeUpdate,
      internals,
      'data-test-subj': dataTestSubj = 'sessionReplayPlayer',
    },
    ref
  ) {
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState<Size>();
    const [session, setSession] = useState<ReplayerSession>();
    const [offsetMs, setOffsetMs] = useState(0);
    const lastOffsetRef = useRef(0);
    const [speed, setSpeed] = useState(DEFAULT_PLAYBACK_SPEED);
    const [skipIdle, setSkipIdle] = useState(false);
    const [, setLoadedBatches] = useState(0);

    const updateOffset = useCallback((offset: number) => {
      lastOffsetRef.current = offset;
      setOffsetMs(offset);
    }, []);

    const sessionRef = useRef<ReplayerSession>();
    /** Offset the user asked for that has not loaded yet; playback continues there once it has. */
    const bufferedSeekRef = useRef<number>();
    const sinkRef = useRef<{ append: (events: readonly ReplayEvent[]) => void }>();

    const { phase, dispatch, getTimelineIndex, retry, continueLoading } = useReplayEvents({
      sessionId,
      recording,
      allowedRemoteOrigins,
      sizeThresholdEvents: internals?.sizeThresholdEvents,
      onEvents: (events) => {
        sinkRef.current?.append(events);
        setLoadedBatches((count) => count + 1);
      },
    });

    const latest = useRef({ phase, onTimeUpdate, skipIdle, getTimelineIndex });
    latest.current = { phase, onTimeUpdate, skipIdle, getTimelineIndex };

    const report = useCallback(
      (offset: number, reason: Parameters<NonNullable<typeof onTimeUpdate>>[1]) => {
        latest.current.onTimeUpdate?.(offset, reason);
      },
      []
    );

    const loadedEndMs = (): number | undefined => {
      const index = latest.current.getTimelineIndex();
      return index && index.size > 0 ? index.durationMs : undefined;
    };

    const isLoadingMore = (): boolean => {
      const { phase: current } = latest.current;
      return (
        current.kind === 'ready' &&
        (current.loading === 'more' || current.loading === 'awaitingContinue')
      );
    };

    const callbacks = useMemo<ReplayerSessionCallbacks>(
      () => ({
        onViewportChange: setViewport,
        onFinish: () => {
          if (latest.current.phase.kind !== 'ready') {
            return;
          }
          const loadedEnd = loadedEndMs();
          if (isLoadingMore()) {
            const target = (loadedEnd ?? 0) + 1;
            bufferedSeekRef.current = target;
            dispatch({ type: 'seek', offsetMs: target, loadedEndMs: loadedEnd });
            return;
          }
          const end = loadedEnd ?? 0;
          dispatch({ type: 'finished' });
          updateOffset(end);
          report(end, 'ended');
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- every dependency is stable or read from refs
      [dispatch, report]
    );

    const { sink } = useReplayerSession({
      sessionId,
      root,
      ready: phase.kind === 'ready',
      speed,
      initialOffsetMs: Math.max(initialOffsetMs ?? 0, 0),
      callbacks,
      loadSessionFactory: internals?.loadSessionFactory,
      onSession: (created) => {
        sessionRef.current = created;
        setSession(created);
        if (created) {
          updateOffset(created.getCurrentOffsetMs());
        }
      },
    });
    sinkRef.current = sink;

    const index = getTimelineIndex();
    const metaDurationMs =
      recording.status === 'available' && recording.meta
        ? recording.meta.endTimestamp - recording.meta.startTimestamp
        : 0;
    const loadingComplete = phase.kind === 'ready' && phase.loading === 'complete';
    const durationMs = Math.max(
      index?.durationMs ?? 0,
      loadingComplete ? 0 : Math.max(metaDurationMs, 0)
    );
    const startTimestamp =
      index?.startTimestamp ??
      (recording.status === 'available' ? recording.meta?.startTimestamp : undefined);
    const loadedEnd = loadedEndMs();

    const durationMsRef = useRef(durationMs);
    durationMsRef.current = durationMs;

    const play = useCallback(() => {
      const current = latest.current.phase;
      const activeSession = sessionRef.current;
      if (!activeSession || current.kind !== 'ready' || current.playback === 'buffering') {
        return;
      }
      const from = current.playback === 'ended' ? 0 : activeSession.getCurrentOffsetMs();
      activeSession.play(from);
      updateOffset(from);
      dispatch({ type: 'play' });
    }, [dispatch, updateOffset]);

    const pause = useCallback(() => {
      const activeSession = sessionRef.current;
      if (!activeSession || latest.current.phase.kind !== 'ready') {
        return;
      }
      bufferedSeekRef.current = undefined;
      const at = activeSession.getCurrentOffsetMs();
      activeSession.pause(at);
      updateOffset(at);
      dispatch({ type: 'pause' });
      report(at, 'paused');
    }, [dispatch, report, updateOffset]);

    const seek = useCallback(
      (target: number) => {
        const current = latest.current.phase;
        const activeSession = sessionRef.current;
        if (!activeSession || current.kind !== 'ready' || !Number.isFinite(target)) {
          return;
        }
        const loadedTo = loadedEndMs();
        const loading = isLoadingMore();
        const total = Math.max(
          latest.current.getTimelineIndex()?.durationMs ?? 0,
          loading ? durationMsRef.current : 0
        );
        const offset = clamp(Math.round(target), 0, loading ? total : loadedTo ?? 0);
        const beyondLoaded = loadedTo === undefined || offset > loadedTo;
        const wasPlaying = current.playback === 'playing';

        dispatch({ type: 'seek', offsetMs: offset, loadedEndMs: loadedTo });
        updateOffset(offset);
        report(offset, 'seeked');

        if (beyondLoaded && loading) {
          bufferedSeekRef.current = offset;
          activeSession.pause(activeSession.getCurrentOffsetMs());
          return;
        }
        bufferedSeekRef.current = undefined;
        activeSession.pause(offset);
        if (wasPlaying) {
          activeSession.play(offset);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reads live values through refs
      [dispatch, report]
    );
    const restart = useCallback(() => {
      seek(0);
      play();
    }, [seek, play]);

    // Playback continues at a seek target that had not loaded once it has.
    useEffect(() => {
      const target = bufferedSeekRef.current;
      if (phase.kind !== 'ready' || target === undefined || phase.playback === 'buffering') {
        return;
      }
      bufferedSeekRef.current = undefined;
      const activeSession = sessionRef.current;
      if (!activeSession) {
        return;
      }
      if (phase.playback === 'playing') {
        activeSession.play(target);
      } else {
        activeSession.pause(Math.min(target, loadedEndMs() ?? target));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- `loadedEndMs` reads refs
    }, [phase]);

    useEffect(() => {
      session?.setSpeed(speed);
    }, [session, speed]);

    // The frame rrweb creates has no accessible name of its own.
    useEffect(() => {
      session?.getWrapper()?.querySelector('iframe')?.setAttribute('title', STAGE_ARIA_LABEL);
    }, [session]);

    const jumpOverIdle = useCallback((offset: number): number => {
      const timeline = latest.current.getTimelineIndex();
      const activeSession = sessionRef.current;
      if (!timeline || !activeSession) {
        return offset;
      }
      const next = nextSkipIdleOffsetMs({ index: timeline, currentOffsetMs: offset });
      if (next === undefined) {
        return offset;
      }
      activeSession.play(next);
      return next;
    }, []);

    usePlayingClock(phase.kind === 'ready' && phase.playback === 'playing' && !!session, {
      onFrame: () => {
        const activeSession = sessionRef.current;
        if (activeSession && latest.current.skipIdle) {
          jumpOverIdle(activeSession.getCurrentOffsetMs());
        }
      },
      onStateTick: () => {
        const activeSession = sessionRef.current;
        if (activeSession) {
          updateOffset(activeSession.getCurrentOffsetMs());
        }
      },
      onReportTick: () => {
        const activeSession = sessionRef.current;
        if (activeSession) {
          report(activeSession.getCurrentOffsetMs(), 'playing');
        }
      },
    });

    const onSkipIdleChange = useCallback(
      (next: boolean) => {
        setSkipIdle(next);
        const activeSession = sessionRef.current;
        if (next && activeSession && latest.current.phase.kind === 'ready') {
          const { playback } = latest.current.phase;
          if (playback === 'playing') {
            updateOffset(jumpOverIdle(activeSession.getCurrentOffsetMs()));
          }
        }
      },
      [jumpOverIdle, updateOffset]
    );

    useImperativeHandle(
      ref,
      () => ({
        seek,
        play,
        pause,
        getCurrentOffsetMs: () => sessionRef.current?.getCurrentOffsetMs() ?? lastOffsetRef.current,
      }),
      [seek, play, pause]
    );

    const prompt = ((): StagePrompt | undefined => {
      switch (phase.kind) {
        case 'loading':
          return { kind: 'loading' };
        case 'unavailable':
          return {
            kind: 'unavailable',
            reason: phase.reason,
            action: recording.status === 'unavailable' ? recording.action : undefined,
          };
        case 'incomplete':
          return { kind: 'incomplete' };
        case 'failed':
          return { kind: 'failed', error: phase.error, onRetry: retry };
        case 'ready':
          return undefined;
      }
    })();

    const notice = ((): LoadingNotice | undefined => {
      if (phase.kind !== 'ready') {
        return undefined;
      }
      switch (phase.loading) {
        case 'failed':
          return { kind: 'failed', onRetry: retry };
        case 'truncated':
          return { kind: 'truncated' };
        case 'awaitingContinue':
          return { kind: 'awaitingContinue', onContinue: continueLoading };
        default:
          return undefined;
      }
    })();

    const layoutStyles = css`
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    `;
    const emptyStyles = css`
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      justify-content: center;
    `;
    const controlsStyles = css`
      flex: 0 0 auto;
    `;

    return (
      <section
        css={layoutStyles}
        aria-label={PLAYER_ARIA_LABEL}
        data-test-subj={dataTestSubj}
        data-session-id={sessionId}
      >
        {prompt && (
          <div css={emptyStyles}>
            <StatePrompt prompt={prompt} />
          </div>
        )}
        {phase.kind === 'ready' && (
          <>
            {notice && <LoadingNoticeCallout notice={notice} />}
            {!session && <EuiProgress size="xs" color="primary" />}
            <PlayerStage viewport={viewport} onRootChange={setRoot} />
            {session && (
              <div css={controlsStyles}>
                <Timeline
                  offsetMs={offsetMs}
                  durationMs={durationMs}
                  loadedEndMs={loadedEnd}
                  startTimestamp={startTimestamp}
                  markers={markers}
                  onSeek={seek}
                />
                <PlayerControls
                  playback={phase.playback}
                  offsetMs={offsetMs}
                  durationMs={durationMs}
                  speed={speed}
                  skipIdle={skipIdle}
                  onPlay={play}
                  onPause={pause}
                  onRestart={restart}
                  onSpeedChange={setSpeed}
                  onSkipIdleChange={onSkipIdleChange}
                />
              </div>
            )}
          </>
        )}
      </section>
    );
  }
);

/**
 * Plays back a recorded session. The recording is supplied by the host through `recording`; the
 * player pages it in, renders it in rrweb's sandboxed frame and keeps the timeline in sync.
 * Changing `sessionId` starts over with a fresh player.
 */
export const SessionReplayPlayer = forwardRef<SessionReplayPlayerHandle, SessionReplayPlayerProps>(
  function SessionReplayPlayer(props, ref) {
    return <SessionReplayPlayerView key={props.sessionId} ref={ref} {...props} />;
  }
);

/** The player with the seams that tests use; not part of the package's public surface. */
export const SessionReplayPlayerForTests = SessionReplayPlayerView;
