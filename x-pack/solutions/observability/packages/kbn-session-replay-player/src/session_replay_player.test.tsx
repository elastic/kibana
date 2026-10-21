/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { StrictMode, Suspense, createRef } from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SessionReplayPlayer } from '..';
import { SessionReplayPlayerForTests } from './session_replay_player';
import { createFakeSessionFactory } from './test_helpers/fake_replayer_session';
import { createInMemoryLoader } from './test_helpers/in_memory_loader';
import {
  T0,
  clickEvent,
  fullSnapshotEvent,
  metaEvent,
  mutationEvent,
} from './test_helpers/replay_events';
import type { ReplayEvent, ReplayRecording, SessionReplayPlayerHandle } from './types';

/** Nine seconds long with a quiet stretch from 1 s to 8 s. */
const RECORDING: ReplayEvent[] = [
  metaEvent(T0),
  fullSnapshotEvent(T0 + 10),
  clickEvent(T0 + 1_000),
  mutationEvent(T0 + 8_000),
  mutationEvent(T0 + 9_000),
];

const slider = () => screen.getByRole('slider', { name: 'Replay position' });

const setup = ({
  events = RECORDING,
  pageSize = 100,
  latencyMs = 0,
  failOnRequests,
  recording,
  props = {},
  sizeThresholdEvents,
  strict = false,
  withMeta = false,
}: {
  events?: ReplayEvent[];
  pageSize?: number;
  latencyMs?: number;
  failOnRequests?: number[];
  recording?: ReplayRecording;
  props?: Partial<React.ComponentProps<typeof SessionReplayPlayerForTests>>;
  sizeThresholdEvents?: number;
  /** Mounts in StrictMode, which runs every effect twice. */
  strict?: boolean;
  /** Tells the player how long the recording is before it has loaded. */
  withMeta?: boolean;
} = {}) => {
  const { factory, sessions } = createFakeSessionFactory();
  const loader = createInMemoryLoader(events, { pageSize, latencyMs, failOnRequests });
  const onTimeUpdate = jest.fn();
  const ref = createRef<SessionReplayPlayerHandle>();
  const available: ReplayRecording = {
    status: 'available',
    loadEvents: loader.loadEvents,
    meta: withMeta ? { startTimestamp: T0, endTimestamp: T0 + 9_000 } : undefined,
  };
  const Mode = strict ? StrictMode : React.Fragment;
  const view = (id: string) => (
    <Mode>
      <SessionReplayPlayerForTests
        ref={ref}
        sessionId={id}
        recording={recording ?? available}
        onTimeUpdate={onTimeUpdate}
        internals={{ loadSessionFactory: async () => factory, sizeThresholdEvents }}
        {...props}
      />
    </Mode>
  );
  const utils = render(view('session-1'));
  return {
    ...utils,
    loader,
    sessions,
    onTimeUpdate,
    ref,
    rerenderWith: (id: string) => utils.rerender(view(id)),
  };
};

const untilReady = () => screen.findByRole('slider', { name: 'Replay position' });

describe('SessionReplayPlayer', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('through the package entry', () => {
    it('renders an accessible region for the session', async () => {
      render(
        <Suspense fallback={null}>
          <SessionReplayPlayer
            sessionId="session-1"
            recording={{ status: 'unavailable', reason: 'noRecording' }}
          />
        </Suspense>
      );

      const region = await screen.findByRole('region', { name: 'Session replay' });

      expect(region).toHaveAttribute('data-session-id', 'session-1');
    });
  });

  describe('states without a recording', () => {
    it.each([
      ['noRecording', 'No recording for this session'],
      ['sampledOut', 'This session was not recorded'],
      ['pastRetention', 'This recording is no longer available'],
    ] as const)('explains %s without loading anything', async (reason, title) => {
      const loadEvents = jest.fn();
      const loadSessionFactory = jest.fn();
      render(
        <SessionReplayPlayerForTests
          sessionId="s"
          recording={{ status: 'unavailable', reason }}
          internals={{ loadSessionFactory }}
        />
      );

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
      expect(loadEvents).not.toHaveBeenCalled();
      expect(loadSessionFactory).not.toHaveBeenCalled();
    });

    it('shows the action the host supplies', async () => {
      render(
        <SessionReplayPlayerForTests
          sessionId="s"
          recording={{
            status: 'unavailable',
            reason: 'noRecording',
            action: <a href="#back">Back</a>,
          }}
        />
      );

      expect(await screen.findByRole('link', { name: 'Back' })).toBeInTheDocument();
    });

    it('reports a recording that has no events as missing', async () => {
      setup({ events: [] });

      expect(
        await screen.findByRole('heading', { name: 'No recording for this session' })
      ).toBeInTheDocument();
    });

    it('explains a recording with events but no snapshot', async () => {
      setup({ events: [metaEvent(T0), clickEvent(T0 + 1), clickEvent(T0 + 2)] });

      expect(await screen.findByTestId('sessionReplayIncomplete')).toBeInTheDocument();
    });
  });

  describe('loading', () => {
    it('shows progress, then the controls and the duration', async () => {
      setup({ latencyMs: 10 });

      expect(screen.getByText('Loading the recording')).toBeInTheDocument();
      await untilReady();

      expect(screen.getByTestId('sessionReplayClock')).toHaveTextContent('0:00 / 0:09');
    });

    it('names the frame the recorded page is shown in', async () => {
      const { container } = setup();
      await untilReady();

      await waitFor(() =>
        expect(container.querySelector('iframe')).toHaveAttribute('title', 'Recorded page')
      );
    });

    it('creates a single session with the playable events', async () => {
      const { sessions } = setup();
      await untilReady();

      await waitFor(() => expect(sessions.length).toBeGreaterThan(0));
      const live = sessions.filter((session) => !session.destroyed());

      expect(live).toHaveLength(1);
      expect(live[0].calls[0]).toBe('pause:0');
    });

    it('offers a retry when the first page fails and recovers', async () => {
      setup({ failOnRequests: [0] });

      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

      expect(await untilReady()).toBeInTheDocument();
    });

    it('keeps the player running and offers a retry when a later page fails', async () => {
      setup({ pageSize: 4, failOnRequests: [1] });
      await untilReady();

      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

      await waitFor(() =>
        expect(screen.queryByTestId('sessionReplayLoadFailedNotice')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('sessionReplayClock')).toHaveTextContent('/ 0:09');
    });

    it('asks before loading a very long recording further', async () => {
      const { loader } = setup({ pageSize: 4, sizeThresholdEvents: 4 });
      await untilReady();

      const keepLoading = await screen.findByRole('button', { name: 'Keep loading' });
      expect(loader.requestedCursors).toHaveLength(1);
      fireEvent.click(keepLoading);

      await waitFor(() => expect(loader.requestedCursors).toHaveLength(2));
    });
  });

  describe('playback', () => {
    it('plays from the current position and pauses where it is', async () => {
      const { sessions, onTimeUpdate } = setup();
      await untilReady();
      const session = () => sessions.filter((s) => !s.destroyed())[0];

      fireEvent.click(screen.getByTestId('sessionReplayPlay'));
      expect(session().calls).toContain('play:0');
      act(() => session().advanceTo(2_500));
      fireEvent.click(screen.getByTestId('sessionReplayPause'));

      expect(session().calls).toContain('pause:2500');
      expect(onTimeUpdate).toHaveBeenCalledWith(2_500, 'paused');
      expect(screen.getByTestId('sessionReplayClock')).toHaveTextContent('0:02 / 0:09');
    });

    it('changes speed while paused without starting playback', async () => {
      const { sessions } = setup();
      await untilReady();

      fireEvent.change(screen.getByRole('combobox', { name: 'Playback speed' }), {
        target: { value: '4' },
      });

      const session = sessions.filter((s) => !s.destroyed())[0];
      expect(session.speed()).toBe(4);
      expect(session.calls.some((call) => call.startsWith('play:'))).toBe(false);
    });

    it('seeks with the keyboard and reports it', async () => {
      const { sessions, onTimeUpdate } = setup();
      await untilReady();

      fireEvent.keyDown(slider(), { key: 'ArrowRight' });

      const session = sessions.filter((s) => !s.destroyed())[0];
      expect(session.calls).toContain('pause:5000');
      expect(onTimeUpdate).toHaveBeenCalledWith(5_000, 'seeked');
      expect(slider()).toHaveAttribute('aria-valuenow', '5000');
    });

    it('keeps playing after a seek while playing', async () => {
      const { sessions } = setup();
      await untilReady();
      const session = () => sessions.filter((s) => !s.destroyed())[0];

      fireEvent.click(screen.getByTestId('sessionReplayPlay'));
      fireEvent.keyDown(slider(), { key: 'End' });

      expect(session().calls.slice(-2)).toEqual(['pause:9000', 'play:9000']);
    });

    it('starts again from the beginning once it has ended', async () => {
      const { sessions, onTimeUpdate } = setup();
      await untilReady();
      const session = () => sessions.filter((s) => !s.destroyed())[0];

      fireEvent.click(screen.getByTestId('sessionReplayPlay'));
      act(() => session().finish());

      expect(onTimeUpdate).toHaveBeenCalledWith(9_000, 'ended');
      fireEvent.click(screen.getByRole('button', { name: 'Replay from the start' }));

      expect(session().calls.slice(-1)).toEqual(['play:0']);
    });

    it('restarts', async () => {
      const { sessions } = setup();
      await untilReady();
      const session = () => sessions.filter((s) => !s.destroyed())[0];
      fireEvent.keyDown(slider(), { key: 'End' });

      fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

      expect(session().calls.slice(-2)).toEqual(['pause:0', 'play:0']);
    });

    it('opens at the requested offset', async () => {
      const { sessions } = setup({ props: { initialOffsetMs: 3_000 } });
      await untilReady();

      const session = sessions.filter((s) => !s.destroyed())[0];

      expect(session.calls[0]).toBe('pause:3000');
      expect(slider()).toHaveAttribute('aria-valuenow', '3000');
    });
  });

  describe('time reports and the handle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('reports at a limited rate while playing', async () => {
      const { sessions, onTimeUpdate } = setup();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      fireEvent.click(screen.getByTestId('sessionReplayPlay'));
      const session = sessions.filter((s) => !s.destroyed())[0];
      onTimeUpdate.mockClear();

      for (let step = 1; step <= 20; step++) {
        act(() => {
          session.advanceTo(step * 50);
          jest.advanceTimersByTime(50);
        });
      }

      const playing = onTimeUpdate.mock.calls.filter(([, reason]) => reason === 'playing');
      expect(playing.length).toBeGreaterThanOrEqual(3);
      expect(playing.length).toBeLessThanOrEqual(5);
    });

    it('lets a host seek, play, pause and read the position', async () => {
      const { sessions, ref } = setup();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      const session = sessions.filter((s) => !s.destroyed())[0];

      act(() => ref.current?.seek(3_000));
      expect(ref.current?.getCurrentOffsetMs()).toBe(3_000);
      act(() => ref.current?.seek(60_000));
      expect(ref.current?.getCurrentOffsetMs()).toBe(9_000);
      act(() => ref.current?.seek(-5));
      act(() => ref.current?.play());
      act(() => ref.current?.pause());

      expect(session.calls).toEqual(
        expect.arrayContaining(['pause:3000', 'pause:9000', 'pause:0', 'play:0'])
      );
    });

    it('skips idle stretches only when asked to', async () => {
      const { sessions } = setup();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      const session = sessions.filter((s) => !s.destroyed())[0];
      fireEvent.click(screen.getByTestId('sessionReplayPlay'));

      act(() => {
        session.advanceTo(1_500);
        jest.advanceTimersByTime(50);
      });
      expect(session.calls).not.toContain('play:8000');

      fireEvent.click(screen.getByTestId('sessionReplaySkipIdle'));

      expect(session.calls).toContain('play:8000');
    });

    it('keeps the last position available after it has been unmounted', async () => {
      const { ref, unmount } = setup();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      act(() => ref.current?.seek(4_000));
      const handle = ref.current;

      unmount();

      expect(handle?.getCurrentOffsetMs()).toBe(4_000);
    });
  });

  describe('events that have not loaded yet', () => {
    it('waits for a seek target and then plays from it', async () => {
      const { sessions } = setup({ pageSize: 4, latencyMs: 30, withMeta: true });
      await untilReady();
      const session = () => sessions.filter((s) => !s.destroyed())[0];

      fireEvent.keyDown(slider(), { key: 'End' });

      await waitFor(() => expect(session().calls).toContain('play:9000'));
      expect(screen.queryByTestId('sessionReplayBuffering')).not.toBeInTheDocument();
    });

    it('shows that it is waiting while the target loads', async () => {
      const { loader } = setup({ pageSize: 4, latencyMs: 200, withMeta: true });
      await untilReady();

      fireEvent.keyDown(slider(), { key: 'End' });

      expect(await screen.findByTestId('sessionReplayBuffering')).toBeInTheDocument();
      await waitFor(() => expect(loader.requestedCursors).toHaveLength(2));
    });
  });

  describe('reaching the end of what has loaded', () => {
    it('waits for more instead of ending while pages are still arriving', async () => {
      const { sessions } = setup({ pageSize: 4, latencyMs: 100, withMeta: true });
      await untilReady();
      const session = () => sessions.filter((s) => !s.destroyed())[0];

      fireEvent.click(screen.getByTestId('sessionReplayPlay'));
      act(() => session().finish());

      expect(await screen.findByTestId('sessionReplayBuffering')).toBeInTheDocument();
      await waitFor(() => expect(session().calls).toContain('play:8001'));
    });
  });

  describe('lifecycle', () => {
    it('destroys the session on unmount', async () => {
      const { sessions, unmount } = setup({ strict: true });
      await untilReady();

      unmount();

      expect(sessions.every((session) => session.destroyed())).toBe(true);
    });

    it('starts over for another session', async () => {
      const { sessions, rerenderWith, loader } = setup({ strict: true });
      await untilReady();
      const first = sessions.filter((s) => !s.destroyed())[0];

      rerenderWith('session-2');
      await untilReady();

      await waitFor(() => expect(first.destroyed()).toBe(true));
      expect(loader.requestedCursors.length).toBeGreaterThanOrEqual(2);
      await waitFor(() => expect(sessions.filter((s) => !s.destroyed())).toHaveLength(1));
    });

    it('survives being mounted and unmounted repeatedly', async () => {
      for (let round = 0; round < 5; round++) {
        const { unmount } = setup({ strict: true });
        await untilReady();
        unmount();
      }
    });
  });
});
