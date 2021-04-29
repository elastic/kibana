/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/public/mocks';

import type { SessionInfo } from '../../common/types';
import { createSessionExpiredMock } from './session_expired.mock';
import {
  EXTENSION_THROTTLE_MS,
  GRACE_PERIOD_MS,
  SESSION_CHECK_MS,
  SESSION_ROUTE,
  SessionTimeout,
  startTimer,
  WARNING_MS,
} from './session_timeout';

jest.mock('broadcast-channel');

jest.useFakeTimers();

jest.spyOn(window, 'addEventListener');
jest.spyOn(window, 'removeEventListener');

jest.spyOn(document, 'addEventListener');
jest.spyOn(document, 'removeEventListener');

const nowMock = jest.spyOn(Date, 'now');
const visibilityStateMock = jest.spyOn(document, 'visibilityState', 'get');

function createSessionTimeout(expiresInMs = 60 * 60 * 1000, canBeExtended = true) {
  const { notifications, http } = coreMock.createSetup();
  const toast = Symbol();
  notifications.toasts.add.mockReturnValue(toast as any);
  const sessionExpired = createSessionExpiredMock();
  const tenant = 'test';
  const sessionTimeout = new SessionTimeout(notifications, sessionExpired, http, tenant);

  http.fetch.mockResolvedValue({
    expiresInMs,
    canBeExtended,
    provider: { type: 'basic', name: 'basic1' },
  } as SessionInfo);

  return { sessionTimeout, sessionExpired, notifications, http };
}
describe('SessionTimeout', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test(`does not initialize when starting an anonymous path`, async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    http.anonymousPaths.isAnonymous.mockReturnValue(true);
    await sessionTimeout.start();
    expect(http.fetch).not.toHaveBeenCalled();
  });

  it('fetches session info when starting', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();
    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith(SESSION_ROUTE, {
      asSystemRequest: true,
      method: 'GET',
    });
  });

  it('adds event handlers when starting', async () => {
    const { sessionTimeout } = createSessionTimeout();
    await sessionTimeout.start();
    expect(window.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('removes event handlers when stopping', async () => {
    const { sessionTimeout } = createSessionTimeout();
    await sessionTimeout.start();
    sessionTimeout.stop();

    expect(window.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('clears timers when stopping', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(100);
    await sessionTimeout.start();
    sessionTimeout.stop();

    jest.advanceTimersByTime(200);

    expect(sessionExpired.logout).not.toHaveBeenCalled();
  });

  it('refetches session info when detecting user activity', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();
    expect(http.fetch).toHaveBeenCalledTimes(1);

    // Increment system time enough so that session extension gets triggered
    nowMock.mockReturnValue(Date.now() + EXTENSION_THROTTLE_MS + 10);
    window.dispatchEvent(new Event('mousemove'));

    expect(http.fetch).toHaveBeenCalledTimes(2);
    nowMock.mockClear();
  });

  it('refetches session info when receiving HTTP response', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();
    expect(http.fetch).toHaveBeenCalledTimes(1);

    // Increment system time enough so that session extension gets triggered
    nowMock.mockReturnValue(Date.now() + EXTENSION_THROTTLE_MS + 10);
    const [{ response: handleHttpResponse }] = http.intercept.mock.calls[0];
    handleHttpResponse!({ fetchOptions: { asSystemRequest: false } } as any, {} as any);

    expect(http.fetch).toHaveBeenCalledTimes(2);
    nowMock.mockClear();
  });

  it('refetches session info before warning is displayed', async () => {
    const { sessionTimeout, http } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();
    expect(http.fetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 60 * 1000 - GRACE_PERIOD_MS - WARNING_MS - SESSION_CHECK_MS);

    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not refetch session info if already recently updated', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    expect(http.fetch).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('mousemove'));

    expect(http.fetch).toHaveBeenCalledTimes(1);
  });

  it('marks HTTP requests as system requests when tab is not visible', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    visibilityStateMock.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    const [{ request: handleHttpRequest }] = http.intercept.mock.calls[0];
    const fetchOptions = handleHttpRequest!({ path: '/test' }, {} as any);
    expect(fetchOptions).toEqual({ asSystemRequest: true });

    visibilityStateMock.mockClear();
  });

  it('does not mark HTTP requests to external URLs as system requests', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    visibilityStateMock.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    const [{ request: handleHttpRequest }] = http.intercept.mock.calls[0];
    const fetchOptions = handleHttpRequest!({ path: 'http://elastic.co/' }, {} as any);
    expect(fetchOptions).toBe(undefined);

    visibilityStateMock.mockClear();
  });

  it('marks HTTP requests as user requests when tab is visible', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    visibilityStateMock.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    const [{ request: handleHttpRequest }] = http.intercept.mock.calls[0];
    const fetchOptions = handleHttpRequest!({ path: '/test' }, {} as any);
    expect(fetchOptions).toEqual({ asSystemRequest: false });

    visibilityStateMock.mockClear();
  });

  it('resets timers when receiving message from other tabs', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(30 * 1000);

    // eslint-disable-next-line dot-notation
    sessionTimeout['channel']!.onmessage!({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 1000,
      canBeExtended: true,
    });

    jest.advanceTimersByTime(30 * 1000);

    expect(sessionExpired.logout).not.toHaveBeenCalled();
  });

  it('shows warning before session expires', async () => {
    const { sessionTimeout, notifications } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(60 * 60 * 1000 - GRACE_PERIOD_MS - WARNING_MS);

    expect(notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'warning', iconType: 'clock' })
    );
  });

  it('hides warning if session gets extended', async () => {
    const { sessionTimeout, notifications } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(60 * 60 * 1000 - GRACE_PERIOD_MS - WARNING_MS);

    expect(notifications.toasts.add).toHaveBeenCalled();

    // eslint-disable-next-line dot-notation
    await sessionTimeout['fetchSessionInfo']!(true);

    expect(notifications.toasts.remove).toHaveBeenCalled();
  });

  it('logs user out slightly before session expires', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(60 * 60 * 1000 - GRACE_PERIOD_MS);

    expect(sessionExpired.logout).toHaveBeenCalled();
  });

  it('logs user out immediately if session expiration is imminent', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(GRACE_PERIOD_MS / 2);
    await sessionTimeout.start();

    jest.advanceTimersByTime(0);

    expect(sessionExpired.logout).toHaveBeenCalled();
  });

  it('does not log user out if session does not expire', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(0);
    await sessionTimeout.start();

    jest.runOnlyPendingTimers();

    expect(sessionExpired.logout).not.toHaveBeenCalled();
  });
});

describe('startTimer', () => {
  it('executes callback after time elapses', () => {
    const callback = jest.fn();
    startTimer(callback, 100);
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('executes callback after a very long time elapses', () => {
    const callback = jest.fn();
    startTimer(callback, 0x7fffffff + 100);
    jest.advanceTimersByTime(0x7fffffff + 100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not executes callback if stopped before time elapses', () => {
    const callback = jest.fn();
    const stop = startTimer(callback, 100);
    jest.advanceTimersByTime(50);
    stop();
    jest.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(0);
  });

  it('does not executes callback if stopped before a very long time elapses', () => {
    const callback = jest.fn();
    const stop = startTimer(callback, 0x7fffffff + 100);
    jest.advanceTimersByTime(0x7fffffff + 50);
    stop();
    jest.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(0);
  });
});
