/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createInMemoryLoader } from '../test_helpers/in_memory_loader';
import { loadFixtureEvents } from '../test_helpers/load_fixture';
import type { ReplayEvent, ReplayRecording } from '../types';
import { useReplayEvents } from './use_replay_events';
import type { UseReplayEventsArgs } from './use_replay_events';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const available = (loadEvents: ReplayRecording & { status: 'available' }): ReplayRecording =>
  loadEvents;

const setup = (initial: Partial<UseReplayEventsArgs> & Pick<UseReplayEventsArgs, 'recording'>) => {
  const delivered: ReplayEvent[] = [];
  const onEvents = (events: readonly ReplayEvent[]) => {
    delivered.push(...events);
  };
  const hook = renderHook((props: UseReplayEventsArgs) => useReplayEvents(props), {
    initialProps: { sessionId: 'session-1', onEvents, ...initial },
  });
  return { ...hook, delivered, onEvents };
};

const waitForPhase = async (
  result: { current: { phase: { kind: string } } },
  predicate: (phase: ReturnType<typeof getPhase>) => boolean
) => {
  for (let attempt = 0; attempt < 200 && !predicate(getPhase(result)); attempt++) {
    await act(async () => {
      await settle();
    });
  }
  expect(predicate(getPhase(result))).toBe(true);
};

const getPhase = (result: { current: { phase: unknown } }) =>
  result.current.phase as { kind: string; loading?: string; playback?: string; reason?: string };

describe('useReplayEvents', () => {
  const events = loadFixtureEvents('checkout_flow');

  it('shows the reason for an unavailable recording and never calls a loader', () => {
    const { result } = setup({
      recording: { status: 'unavailable', reason: 'sampledOut' },
    });

    expect(result.current.phase).toEqual({ kind: 'unavailable', reason: 'sampledOut' });
  });

  it('loads every page, hands the events over in order and ends ready and complete', async () => {
    const loader = createInMemoryLoader(events, { pageSize: 10 });
    const { result, delivered } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
    });

    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    expect(delivered).toEqual(events);
    expect(result.current.getTimelineIndex()?.durationMs).toBe(
      events[events.length - 1].timestamp - events[0].timestamp
    );
  });

  it('becomes ready, paused, while pages are still arriving', async () => {
    const loader = createInMemoryLoader(events, { pageSize: 10, latencyMs: 20 });
    const { result } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
    });

    await waitForPhase(result, (phase) => phase.kind === 'ready');

    expect(getPhase(result)).toMatchObject({ playback: 'paused' });
  });

  it('neutralises fetching URLs in the events it hands over, keeping displayed ones', async () => {
    const hostile = loadFixtureEvents('hostile_content');
    const loader = createInMemoryLoader(hostile, { pageSize: 50 });
    const { result, delivered } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
    });

    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    const text = JSON.stringify(delivered);
    expect(text).not.toMatch(
      /evil\.example\/(p\.gif|link\.css|import\.css|frame\.html|font\.woff2)/
    );
    expect(text).toContain('https://evil.example/display-only');
  });

  it('restarts only when the session changes, aborting the previous load', async () => {
    const signals: AbortSignal[] = [];
    const loader = createInMemoryLoader(events, { pageSize: 5, latencyMs: 10 });
    const recordingFor = (): ReplayRecording => ({
      status: 'available',
      loadEvents: (request) => {
        signals.push(request.signal);
        return loader.loadEvents(request);
      },
    });
    const { result, rerender, onEvents } = setup({ recording: recordingFor() });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    rerender({ sessionId: 'session-1', recording: recordingFor(), onEvents });
    const callsAfterRerender = signals.length;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(signals[0].aborted).toBe(false);
    expect(signals.length).toBeGreaterThanOrEqual(callsAfterRerender);
    expect(new Set(signals).size).toBe(1);

    rerender({ sessionId: 'session-2', recording: recordingFor(), onEvents });
    await waitForPhase(result, (phase) => phase.kind === 'ready');

    expect(signals[0].aborted).toBe(true);
    expect(new Set(signals).size).toBe(2);
  });

  it('fails when the first request fails and recovers on retry', async () => {
    const loader = createInMemoryLoader(events, { pageSize: 10, failOnRequests: [0] });
    const { result, delivered } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
    });

    await waitForPhase(result, (phase) => phase.kind === 'failed');
    act(() => result.current.retry());
    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    expect(delivered).toEqual(events);
  });

  it('keeps the player and flags a later failure, then resumes from the same cursor', async () => {
    const loader = createInMemoryLoader(events, { pageSize: 10, failOnRequests: [2] });
    const { result, delivered } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
    });

    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'failed');
    expect(delivered).toHaveLength(20);

    act(() => result.current.retry());
    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    expect(delivered).toEqual(events);
    expect(loader.requestedCursors.filter((cursor) => cursor === '20')).toHaveLength(2);
  });

  it('asks whether to continue at the size threshold and carries on when told to', async () => {
    const long = loadFixtureEvents('long_session');
    const loader = createInMemoryLoader(long, { pageSize: 100 });
    const { result, delivered } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
      sizeThresholdEvents: 150,
    });

    await waitForPhase(
      result,
      (phase) => phase.kind === 'ready' && phase.loading === 'awaitingContinue'
    );
    expect(delivered).toHaveLength(200);

    act(() => result.current.continueLoading());
    await waitForPhase(
      result,
      (phase) => phase.kind === 'ready' && phase.loading === 'awaitingContinue'
    );
    act(() => result.current.continueLoading());
    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    expect(delivered).toHaveLength(long.length);
  });

  it('delivers each event once under StrictMode double effects', async () => {
    const loader = createInMemoryLoader(events, { pageSize: 10 });
    const delivered: ReplayEvent[] = [];
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(
      () =>
        useReplayEvents({
          sessionId: 'session-1',
          recording: { status: 'available', loadEvents: loader.loadEvents },
          onEvents: (batch) => {
            delivered.push(...batch);
          },
        }),
      { wrapper }
    );

    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    expect(delivered).toEqual(events);
  });

  it('lets the player report playback intent through dispatch', async () => {
    const loader = createInMemoryLoader(events, { pageSize: 100 });
    const { result } = setup({
      recording: available({ status: 'available', loadEvents: loader.loadEvents }),
    });
    await waitForPhase(result, (phase) => phase.kind === 'ready' && phase.loading === 'complete');

    act(() => result.current.dispatch({ type: 'play' }));

    expect(getPhase(result)).toMatchObject({ playback: 'playing' });
  });
});
