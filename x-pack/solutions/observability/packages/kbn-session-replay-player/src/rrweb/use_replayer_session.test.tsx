/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { loadFixtureEvents } from '../test_helpers/load_fixture';
import { createFakeSessionFactory } from '../test_helpers/fake_replayer_session';
import type { ReplayEvent } from '../types';
import { useReplayerSession } from './use_replayer_session';
import type { UseReplayerSessionArgs } from './use_replayer_session';
import type { ReplayerSession } from './types';

const events = loadFixtureEvents('checkout_flow');
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setup = (overrides: Partial<UseReplayerSessionArgs> = {}) => {
  const { factory, sessions } = createFakeSessionFactory();
  const loadSessionFactory = jest.fn(async () => factory);
  const onSession = jest.fn<void, [ReplayerSession | undefined]>();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const args: UseReplayerSessionArgs = {
    sessionId: 'session-1',
    root,
    ready: false,
    speed: 1,
    callbacks: { onFinish: jest.fn(), onViewportChange: jest.fn() },
    onSession,
    loadSessionFactory,
    ...overrides,
  };
  const hook = renderHook((props: UseReplayerSessionArgs) => useReplayerSession(props), {
    initialProps: args,
  });
  return { ...hook, args, sessions, loadSessionFactory, onSession, root };
};

const feed = (
  result: { current: { sink: { append: (e: readonly ReplayEvent[]) => void } } },
  batch: readonly ReplayEvent[]
) => act(() => result.current.sink.append(batch));

describe('useReplayerSession', () => {
  it('does not load rrweb or create a session until the recording is ready', async () => {
    const { result, loadSessionFactory, sessions } = setup({ ready: false });

    feed(result, events.slice(0, 5));
    await flush();

    expect(loadSessionFactory).not.toHaveBeenCalled();
    expect(sessions).toHaveLength(0);
  });

  it('does not create a session before its mount element exists', async () => {
    const { result, loadSessionFactory } = setup({ ready: true, root: null });

    feed(result, events.slice(0, 5));
    await flush();

    expect(loadSessionFactory).not.toHaveBeenCalled();
  });

  it('creates the session from the events buffered before it, showing the first frame', async () => {
    const { result, rerender, args, sessions, onSession } = setup({ initialOffsetMs: 1_500 });
    feed(result, events.slice(0, 6));

    rerender({ ...args, ready: true, initialOffsetMs: 1_500 });
    await flush();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].calls).toEqual(['pause:1500']);
    expect(onSession).toHaveBeenLastCalledWith(sessions[0]);
  });

  it('appends events that arrive after the session exists', async () => {
    const { result, rerender, args, sessions } = setup();
    feed(result, events.slice(0, 6));
    rerender({ ...args, ready: true });
    await flush();

    feed(result, events.slice(6, 12));

    expect(sessions[0].appended).toEqual(events.slice(6, 12));
  });

  it('waits for enough events before creating the session', async () => {
    const { result, rerender, args, sessions } = setup();
    feed(result, events.slice(0, 1));
    rerender({ ...args, ready: true });
    await flush();
    expect(sessions).toHaveLength(0);
  });

  it('destroys the session on unmount and tells the owner it is gone', async () => {
    const { result, rerender, args, sessions, unmount, onSession } = setup();
    feed(result, events.slice(0, 6));
    rerender({ ...args, ready: true });
    await flush();

    unmount();

    expect(sessions[0].destroyed()).toBe(true);
    expect(onSession).toHaveBeenLastCalledWith(undefined);
  });

  it('does not create a session when it is unmounted while rrweb is still loading', async () => {
    let release: () => void = () => undefined;
    const { factory, sessions } = createFakeSessionFactory();
    const loadSessionFactory = jest.fn(
      () =>
        new Promise<typeof factory>((resolve) => {
          release = () => resolve(factory);
        })
    );
    const { result, rerender, args, unmount } = setup({ loadSessionFactory });
    feed(result, events.slice(0, 6));
    rerender({ ...args, ready: true, loadSessionFactory });

    unmount();
    release();
    await flush();

    expect(sessions).toHaveLength(0);
  });

  it('rebuilds the session when the recording changes', async () => {
    const { result, rerender, args, sessions } = setup();
    feed(result, events.slice(0, 6));
    rerender({ ...args, ready: true });
    await flush();

    rerender({ ...args, ready: true, sessionId: 'session-2' });
    feed(result, events.slice(0, 6));
    await flush();

    expect(sessions).toHaveLength(2);
    expect(sessions[0].destroyed()).toBe(true);
  });
});
