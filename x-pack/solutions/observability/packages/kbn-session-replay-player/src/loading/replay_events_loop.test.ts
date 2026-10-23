/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clickEvent,
  fullSnapshotEvent,
  metaEvent,
  T0,
  toReplayEvent,
} from '../test_helpers/replay_events';
import { createInMemoryLoader } from '../test_helpers/in_memory_loader';
import { loadFixtureEvents } from '../test_helpers/load_fixture';
import type { ReplayEvent } from '../types';
import { ReplayEventsLoop } from './replay_events_loop';
import type { LoadedBatch, ReplayEventsLoopOptions } from './replay_events_loop';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const until = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 200 && !condition(); attempt++) {
    await settle();
  }
  expect(condition()).toBe(true);
};

interface Recorder {
  batches: LoadedBatch[];
  failures: Array<{ error: Error; hasPlayablePrefix: boolean }>;
  stuck: number;
  thresholds: number;
}

const createLoop = (
  options: Partial<ReplayEventsLoopOptions> & Pick<ReplayEventsLoopOptions, 'loadEvents'>
) => {
  const recorder: Recorder = { batches: [], failures: [], stuck: 0, thresholds: 0 };
  const loop = new ReplayEventsLoop({
    neutralize: (event) => event,
    onBatch: (batch) => recorder.batches.push(batch),
    onFailure: (error, hasPlayablePrefix) => recorder.failures.push({ error, hasPlayablePrefix }),
    onStuck: () => {
      recorder.stuck += 1;
    },
    onSizeThreshold: () => {
      recorder.thresholds += 1;
    },
    ...options,
  });
  return { loop, recorder };
};

const simpleRecording = (): ReplayEvent[] => [
  metaEvent(T0),
  fullSnapshotEvent(T0 + 1),
  clickEvent(T0 + 1_000),
  clickEvent(T0 + 2_000),
  clickEvent(T0 + 3_000),
];

describe('ReplayEventsLoop', () => {
  it('requests pages one at a time, each with the cursor of the page before', async () => {
    const loader = createInMemoryLoader(simpleRecording(), { pageSize: 2 });
    const { loop, recorder } = createLoop({ loadEvents: loader.loadEvents });

    loop.start();
    await until(() => recorder.batches.some(({ complete }) => complete));

    expect(loader.requestedCursors).toEqual([undefined, '2', '4']);
    expect(recorder.batches.map(({ events }) => events.length)).toEqual([2, 2, 1]);
    expect(recorder.batches.map(({ complete }) => complete)).toEqual([false, false, true]);
  });

  it('reports a playable prefix as soon as a viewport, a snapshot and two events have arrived', async () => {
    const loader = createInMemoryLoader(simpleRecording(), { pageSize: 1 });
    const { loop, recorder } = createLoop({ loadEvents: loader.loadEvents });

    loop.start();
    await until(() => recorder.batches.length === 5);

    expect(recorder.batches.map(({ hasPlayablePrefix }) => hasPlayablePrefix)).toEqual([
      false,
      true,
      true,
      true,
      true,
    ]);
    expect(recorder.batches.map(({ playableCount }) => playableCount)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps only replay events and orders each page by time', async () => {
    const events = [
      clickEvent(T0 + 500),
      metaEvent(T0),
      toReplayEvent({ type: 4, timestamp: T0 - 1, data: { href: 'x', width: 1, height: 1 } }),
    ];
    const withMarker = [...events, { type: 99, timestamp: T0, data: { name: 'replay-started' } }];
    const { loop, recorder } = createLoop({
      loadEvents: async () => ({ events: withMarker as unknown as ReplayEvent[] }),
    });

    loop.start();
    await until(() => recorder.batches.length === 1);

    expect(recorder.batches[0].events.map(({ timestamp }) => timestamp)).toEqual([
      T0 - 1,
      T0,
      T0 + 500,
    ]);
  });

  it('applies the neutraliser to every event in order across pages', async () => {
    const seen: number[] = [];
    const loader = createInMemoryLoader(simpleRecording(), { pageSize: 2 });
    const { loop, recorder } = createLoop({
      loadEvents: loader.loadEvents,
      neutralize: (event) => {
        seen.push(event.timestamp);
        return event;
      },
    });

    loop.start();
    await until(() => recorder.batches.some(({ complete }) => complete));

    expect(seen).toEqual(simpleRecording().map(({ timestamp }) => timestamp));
  });

  it('tracks the loaded range in its time index', async () => {
    const loader = createInMemoryLoader(simpleRecording(), { pageSize: 3 });
    const { loop, recorder } = createLoop({ loadEvents: loader.loadEvents });

    loop.start();
    await until(() => recorder.batches.some(({ complete }) => complete));

    expect(loop.index.durationMs).toBe(3_000);
    expect(recorder.batches.map(({ loadedEndMs }) => loadedEndMs)).toEqual([1_000, 3_000]);
  });

  it('treats an empty recording as complete with nothing loaded', async () => {
    const { loop, recorder } = createLoop({ loadEvents: async () => ({ events: [] }) });

    loop.start();
    await until(() => recorder.batches.length === 1);

    expect(recorder.batches[0]).toMatchObject({
      complete: true,
      playableCount: 0,
      hasPlayablePrefix: false,
      loadedEndMs: undefined,
    });
  });

  describe('failures', () => {
    it('reports a failure and retries the same cursor without applying a page twice', async () => {
      const loader = createInMemoryLoader(simpleRecording(), { pageSize: 2, failOnRequests: [1] });
      const { loop, recorder } = createLoop({ loadEvents: loader.loadEvents });

      loop.start();
      await until(() => recorder.failures.length === 1);
      expect(recorder.failures[0]).toMatchObject({ hasPlayablePrefix: true });
      expect(recorder.batches).toHaveLength(1);

      loop.retry();
      await until(() => recorder.batches.some(({ complete }) => complete));

      expect(loader.requestedCursors).toEqual([undefined, '2', '2', '4']);
      expect(recorder.batches.map(({ playableCount }) => playableCount)).toEqual([2, 4, 5]);
    });

    it('reports that nothing is playable when the first request fails', async () => {
      const loader = createInMemoryLoader(simpleRecording(), { pageSize: 2, failOnRequests: [0] });
      const { loop, recorder } = createLoop({ loadEvents: loader.loadEvents });

      loop.start();
      await until(() => recorder.failures.length === 1);

      expect(recorder.failures[0]).toMatchObject({ hasPlayablePrefix: false });
    });

    it('wraps a non-error rejection', async () => {
      const { loop, recorder } = createLoop({
        loadEvents: () => Promise.reject(new Error('plain')),
      });

      loop.start();
      await until(() => recorder.failures.length === 1);

      expect(recorder.failures[0].error.message).toBe('plain');
    });

    it('ignores retry while a request is in flight', async () => {
      const loader = createInMemoryLoader(simpleRecording(), { pageSize: 5, latencyMs: 10 });
      const { loop, recorder } = createLoop({ loadEvents: loader.loadEvents });

      loop.start();
      loop.retry();
      await until(() => recorder.batches.length === 1);

      expect(loader.requestedCursors).toHaveLength(1);
    });
  });

  it('stops and reports when the loader returns a cursor it was already given', async () => {
    const { loop, recorder } = createLoop({
      loadEvents: async () => ({ events: [clickEvent(T0)], nextCursor: 'same' }),
    });

    loop.start();
    await until(() => recorder.stuck === 1);

    expect(recorder.batches).toHaveLength(2);
  });

  describe('size threshold', () => {
    it('pauses at the threshold and carries on, asking again after another batch', async () => {
      const events = loadFixtureEvents('long_session');
      const loader = createInMemoryLoader(events, { pageSize: 100 });
      const { loop, recorder } = createLoop({
        loadEvents: loader.loadEvents,
        sizeThresholdEvents: 150,
      });

      loop.start();
      await until(() => recorder.thresholds === 1);
      expect(recorder.batches.at(-1)?.playableCount).toBe(200);
      expect(recorder.batches.some(({ complete }) => complete)).toBe(false);

      loop.continueLoading();
      await until(() => recorder.thresholds === 2);
      expect(recorder.batches.at(-1)?.playableCount).toBe(300);

      loop.continueLoading();
      await until(() => recorder.batches.some(({ complete }) => complete));
      expect(recorder.batches.at(-1)?.playableCount).toBe(events.length);
    });
  });

  describe('abort', () => {
    it('aborts the request in flight and delivers nothing afterwards', async () => {
      let received: AbortSignal | undefined;
      const { loop, recorder } = createLoop({
        loadEvents: ({ signal }) => {
          received = signal;
          return new Promise((resolve) =>
            setTimeout(() => resolve({ events: simpleRecording() }), 20)
          );
        },
      });

      loop.start();
      await settle();
      loop.abort();
      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(received?.aborted).toBe(true);
      expect(recorder.batches).toEqual([]);
      expect(recorder.failures).toEqual([]);
    });

    it('does not report the failure of an aborted request', async () => {
      const { loop, recorder } = createLoop({
        loadEvents: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      });

      loop.start();
      await settle();
      loop.abort();
      await settle();

      expect(recorder.failures).toEqual([]);
    });

    it('does not start after being aborted', async () => {
      const loader = createInMemoryLoader(simpleRecording(), { pageSize: 5 });
      const { loop } = createLoop({ loadEvents: loader.loadEvents });

      loop.abort();
      loop.start();
      await settle();

      expect(loader.requestedCursors).toEqual([]);
    });
  });
});
