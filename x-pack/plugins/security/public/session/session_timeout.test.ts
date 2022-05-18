/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BroadcastChannel } from 'broadcast-channel';

import type { ToastInputFields } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

import {
  SESSION_CHECK_MS,
  SESSION_EXPIRATION_WARNING_MS,
  SESSION_EXTENSION_THROTTLE_MS,
  SESSION_GRACE_PERIOD_MS,
  SESSION_ROUTE,
} from '../../common/constants';
import type { SessionInfo } from '../../common/types';
import { createSessionExpiredMock } from './session_expired.mock';
import type { SessionState } from './session_timeout';
import { SessionTimeout, startTimer } from './session_timeout';

jest.mock('broadcast-channel');

jest.useFakeTimers();

jest.spyOn(window, 'addEventListener');
jest.spyOn(window, 'removeEventListener');

jest.spyOn(document, 'addEventListener');
jest.spyOn(document, 'removeEventListener');

const nowMock = jest.spyOn(Date, 'now');
const visibilityStateMock = jest.spyOn(document, 'visibilityState', 'get');

function createSessionTimeout(expiresInMs: number | null = 60 * 60 * 1000, canBeExtended = true) {
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
    jest.clearAllTimers();
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

    expect(window.addEventListener).not.toHaveBeenCalled();
    expect(document.addEventListener).not.toHaveBeenCalled();

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

    expect(window.removeEventListener).not.toHaveBeenCalled();
    expect(document.removeEventListener).not.toHaveBeenCalled();

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

  it('extends session when detecting user activity', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();
    expect(http.fetch).toHaveBeenCalledTimes(1);

    // Increment system time far enough to bypass throttle time
    nowMock.mockReturnValue(Date.now() + SESSION_EXTENSION_THROTTLE_MS + 10);

    // Trigger session extension and wait for next tick
    window.dispatchEvent(new Event('mousemove'));
    await new Promise((resolve) => process.nextTick(resolve));

    expect(http.fetch).toHaveBeenCalledTimes(2);
    expect(http.fetch).toHaveBeenLastCalledWith(
      SESSION_ROUTE,
      expect.objectContaining({ asSystemRequest: false })
    );
  });

  it('refetches session info before warning is displayed', async () => {
    const { sessionTimeout, http } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();
    expect(http.fetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(
      60 * 60 * 1000 - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS - SESSION_CHECK_MS
    );

    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not extend session if recently extended', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    expect(http.fetch).toHaveBeenCalledTimes(1);

    // Trigger session extension and wait for next tick
    window.dispatchEvent(new Event('mousemove'));
    await new Promise((resolve) => process.nextTick(resolve));

    expect(http.fetch).toHaveBeenCalledTimes(1);
  });

  it('exponentially increases retry time when extending session fails', async () => {
    nowMock.mockReturnValue(0);

    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    expect(http.fetch).toHaveBeenCalledTimes(1);

    // Increment system time far enough to bypass throttle time
    nowMock.mockReturnValue(Date.now() + SESSION_EXTENSION_THROTTLE_MS + 10);

    // Now make subsequent HTTP calls fail
    http.fetch.mockRejectedValue(new Error('Failure'));

    // Trigger session extension and wait for next tick
    window.dispatchEvent(new Event('mousemove'));
    await new Promise((resolve) => process.nextTick(resolve));

    expect(http.fetch).toHaveBeenCalledTimes(2);

    // Increment system time far enough to bypass throttle time
    nowMock.mockReturnValue(Date.now() + SESSION_EXTENSION_THROTTLE_MS + 10);

    // Trigger session extension and wait for next tick
    window.dispatchEvent(new Event('mousemove'));
    await new Promise((resolve) => process.nextTick(resolve));

    // Without exponential retry backoff, this would have been called a 3rd time
    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('marks HTTP requests as system requests when tab is not visible', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    visibilityStateMock.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    const [{ request: handleHttpRequest }] = http.intercept.mock.calls[0];
    const fetchOptions = handleHttpRequest!({ path: '/test' }, {} as any);
    expect(fetchOptions).toEqual({ path: '/test', asSystemRequest: true });
  });

  it('does not mark HTTP requests to external URLs as system requests', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    visibilityStateMock.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    const [{ request: handleHttpRequest }] = http.intercept.mock.calls[0];
    const fetchOptions = handleHttpRequest!({ path: 'http://elastic.co/' }, {} as any);
    expect(fetchOptions).toBe(undefined);
  });

  it('marks HTTP requests as user requests when tab is visible', async () => {
    const { sessionTimeout, http } = createSessionTimeout();
    await sessionTimeout.start();

    visibilityStateMock.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    const [{ request: handleHttpRequest }] = http.intercept.mock.calls[0];
    const fetchOptions = handleHttpRequest!({ path: '/test' }, {} as any);
    expect(fetchOptions).toEqual({ path: '/test', asSystemRequest: false });
  });

  it('resets timers when receiving message from other tabs', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(30 * 1000);

    const [broadcastChannelMock] = jest.requireMock('broadcast-channel').BroadcastChannel.mock
      .instances as [BroadcastChannel<SessionState>];

    broadcastChannelMock.onmessage!({
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

    jest.advanceTimersByTime(
      60 * 60 * 1000 - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS
    );

    expect(notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'warning', iconType: 'clock' })
    );
  });

  it('extends session when closing expiration warning', async () => {
    const { sessionTimeout, notifications, http } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenLastCalledWith(
      SESSION_ROUTE,
      expect.objectContaining({ asSystemRequest: true })
    );

    jest.runOnlyPendingTimers();

    expect(http.fetch).toHaveBeenCalledTimes(2);
    expect(http.fetch).toHaveBeenLastCalledWith(
      SESSION_ROUTE,
      expect.objectContaining({ asSystemRequest: true })
    );

    const [toast] = notifications.toasts.add.mock.calls[0] as [ToastInputFields];

    await toast.onClose!();

    expect(http.fetch).toHaveBeenCalledTimes(3);
    expect(http.fetch).toHaveBeenLastCalledWith(
      SESSION_ROUTE,
      expect.objectContaining({ asSystemRequest: false })
    );
  });

  it('show warning 5 minutes before expiration if not previously dismissed', async () => {
    const { sessionTimeout, notifications } = createSessionTimeout(null);
    await sessionTimeout.start();

    const expiresInMs = 10 * 60 * 1000;
    const showWarningInMs = expiresInMs - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS;

    // eslint-disable-next-line dot-notation
    sessionTimeout['resetTimers']({
      lastExtensionTime: Date.now() + 1 * 60 * 1000,
      expiresInMs,
      canBeExtended: false,
    });

    jest.advanceTimersByTime(showWarningInMs);

    expect(notifications.toasts.add).toHaveBeenCalled();
  });

  it('do not show warning again if previously dismissed', async () => {
    const { sessionTimeout, notifications } = createSessionTimeout(null);
    await sessionTimeout.start();

    const expiresInMs = 10 * 60 * 1000;
    const showWarningInMs = expiresInMs - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS;

    // eslint-disable-next-line dot-notation
    sessionTimeout['snoozedWarningState'] = {
      lastExtensionTime: Date.now(),
      expiresInMs,
      canBeExtended: false,
    };

    // eslint-disable-next-line dot-notation
    sessionTimeout['resetTimers']({
      lastExtensionTime: Date.now() + 1 * 60 * 1000,
      expiresInMs,
      canBeExtended: false,
    });

    // We would normally show the warning at this point in time. However, since the warning has been
    // dismissed for 10 minutes we will only show it after 10 minutes have elapsed
    jest.advanceTimersByTime(showWarningInMs);
    expect(notifications.toasts.add).not.toHaveBeenCalled();

    // Advance the timer further so that a total have 10 minutes would have passed. This is the
    // expiration time of the warning that was dismissed.
    jest.advanceTimersByTime(9 * 60 * 1000 - showWarningInMs);
    expect(notifications.toasts.add).toHaveBeenCalled();
  });

  it('hides warning if session gets extended', async () => {
    const { sessionTimeout, notifications } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(
      60 * 60 * 1000 - SESSION_GRACE_PERIOD_MS - SESSION_EXPIRATION_WARNING_MS
    );

    expect(notifications.toasts.add).toHaveBeenCalled();

    // eslint-disable-next-line dot-notation
    await sessionTimeout['fetchSessionInfo'](true);

    expect(notifications.toasts.remove).toHaveBeenCalled();
  });

  it('logs user out slightly before session expires', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(60 * 60 * 1000);
    await sessionTimeout.start();

    jest.advanceTimersByTime(60 * 60 * 1000 - SESSION_GRACE_PERIOD_MS);

    expect(sessionExpired.logout).toHaveBeenCalled();
  });

  it('logs user out immediately if session expiration is imminent', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(SESSION_GRACE_PERIOD_MS / 2);
    await sessionTimeout.start();

    jest.advanceTimersByTime(0);

    expect(sessionExpired.logout).toHaveBeenCalled();
  });

  it('does not log user out if session does not expire', async () => {
    const { sessionTimeout, sessionExpired } = createSessionTimeout(null);
    await sessionTimeout.start();

    jest.runOnlyPendingTimers();

    expect(sessionExpired.logout).not.toHaveBeenCalled();
  });

  it('does not log user out if session does not exist', async () => {
    const { sessionTimeout, sessionExpired, http } = createSessionTimeout();

    http.fetch.mockResolvedValue(''); // Session endpoint return 204 No content when session does not exist
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
