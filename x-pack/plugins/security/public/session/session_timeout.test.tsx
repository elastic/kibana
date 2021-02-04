/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/public/mocks';
import BroadcastChannel from 'broadcast-channel';
import { SessionTimeout } from './session_timeout';
import { createSessionExpiredMock } from './session_expired.mock';
import { mountWithIntl } from '@kbn/test/jest';

jest.useFakeTimers();

const expectNoWarningToast = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications']
) => {
  expect(notifications.toasts.add).not.toHaveBeenCalled();
};

const expectIdleTimeoutWarningToast = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications'],
  toastLifeTimeMs: number = 60000
) => {
  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect(notifications.toasts.add.mock.calls[0][0]).toMatchInlineSnapshot(
    {
      text: expect.any(Function),
    },
    `
    Object {
      "color": "warning",
      "iconType": "clock",
      "text": Any<Function>,
      "title": "Warning",
      "toastLifeTimeMs": ${toastLifeTimeMs},
    }
    `
  );
};

const expectLifespanWarningToast = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications'],
  toastLifeTimeMs: number = 60000
) => {
  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect(notifications.toasts.add.mock.calls[0][0]).toMatchInlineSnapshot(
    {
      text: expect.any(Function),
    },
    `
    Object {
      "color": "danger",
      "iconType": "alert",
      "text": Any<Function>,
      "title": "Warning",
      "toastLifeTimeMs": ${toastLifeTimeMs},
    }
    `
  );
};

const expectWarningToastHidden = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications'],
  toast: symbol
) => {
  expect(notifications.toasts.remove).toHaveBeenCalledTimes(1);
  expect(notifications.toasts.remove).toHaveBeenCalledWith(toast);
};

describe('Session Timeout', () => {
  const now = new Date().getTime();
  const defaultSessionInfo = {
    now,
    idleTimeoutExpiration: now + 2 * 60 * 1000,
    lifespanExpiration: null,
    provider: { type: 'basic', name: 'basic1' },
  };
  let notifications: ReturnType<typeof coreMock.createSetup>['notifications'];
  let http: ReturnType<typeof coreMock.createSetup>['http'];
  let sessionExpired: ReturnType<typeof createSessionExpiredMock>;
  let sessionTimeout: SessionTimeout;
  const toast = Symbol();

  beforeAll(() => {
    BroadcastChannel.enforceOptions({
      type: 'simulate',
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: jest.fn(() => null),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    const setup = coreMock.createSetup();
    notifications = setup.notifications;
    http = setup.http;
    notifications.toasts.add.mockReturnValue(toast as any);
    sessionExpired = createSessionExpiredMock();
    const tenant = '';
    sessionTimeout = new SessionTimeout(notifications, sessionExpired, http, tenant);

    // default mocked response for checking session info
    http.fetch.mockResolvedValue(defaultSessionInfo);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    sessionTimeout.stop();
  });

  afterAll(() => {
    BroadcastChannel.enforceOptions(null);
    delete (window as any).sessionStorage;
  });

  describe('Lifecycle', () => {
    test(`starts and initializes on a non-anonymous path`, async () => {
      await sessionTimeout.start();
      // eslint-disable-next-line dot-notation
      expect(sessionTimeout['channel']).not.toBeUndefined();
      expect(http.fetch).toHaveBeenCalledTimes(1);
    });

    test(`starts and does not initialize on an anonymous path`, async () => {
      http.anonymousPaths.isAnonymous.mockReturnValue(true);
      await sessionTimeout.start();
      // eslint-disable-next-line dot-notation
      expect(sessionTimeout['channel']).toBeUndefined();
      expect(http.fetch).not.toHaveBeenCalled();
    });

    test(`stops`, async () => {
      await sessionTimeout.start();
      // eslint-disable-next-line dot-notation
      const close = jest.fn(sessionTimeout['channel']!.close);
      // eslint-disable-next-line dot-notation
      sessionTimeout['channel']!.close = close;
      // eslint-disable-next-line dot-notation
      const cleanup = jest.fn(sessionTimeout['cleanup']);
      // eslint-disable-next-line dot-notation
      sessionTimeout['cleanup'] = cleanup;

      sessionTimeout.stop();
      expect(close).toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalled();
    });

    test(`stop works properly for large timeouts`, async () => {
      http.fetch.mockResolvedValue({
        ...defaultSessionInfo,
        idleTimeoutExpiration: now + 5_000_000_000,
      });
      await sessionTimeout.start();

      // Advance timers far enough to call intermediate `setTimeout` multiple times, but before any
      // of the timers is supposed to be triggered.
      jest.advanceTimersByTime(5_000_000_000 - (60 + 5 + 2) * 1000);

      sessionTimeout.stop();

      // Advance timer even further and make sure that timers were properly cleaned up.
      jest.runAllTimers();

      expect(http.fetch).toHaveBeenCalledTimes(1);
      expect(sessionExpired.logout).not.toHaveBeenCalled();
      expectNoWarningToast(notifications);
    });
  });

  describe('API calls', () => {
    const methodName = 'handleSessionInfoAndResetTimers';
    let method: jest.Mock;

    beforeEach(() => {
      method = jest.fn(sessionTimeout[methodName]);
      sessionTimeout[methodName] = method;
    });

    test(`handles success`, async () => {
      await sessionTimeout.start();

      expect(http.fetch).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line dot-notation
      expect(sessionTimeout['sessionInfo']).toBe(defaultSessionInfo);
      expect(method).toHaveBeenCalledTimes(1);
    });

    test(`handles error`, async () => {
      const mockErrorResponse = new Error('some-error');
      http.fetch.mockRejectedValue(mockErrorResponse);
      await sessionTimeout.start();

      expect(http.fetch).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line dot-notation
      expect(sessionTimeout['sessionInfo']).toBeUndefined();
      expect(method).not.toHaveBeenCalled();
    });
  });

  describe('warning toast', () => {
    test(`shows idle timeout warning toast`, async () => {
      await sessionTimeout.start();

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      jest.advanceTimersByTime(55 * 1000);
      expectIdleTimeoutWarningToast(notifications);
    });

    test(`shows idle timeout warning toast even for large timeouts`, async () => {
      http.fetch.mockResolvedValue({
        ...defaultSessionInfo,
        idleTimeoutExpiration: now + 5_000_000_000,
      });
      await sessionTimeout.start();

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      jest.advanceTimersByTime(5_000_000_000 - 66 * 1000);
      expectNoWarningToast(notifications);

      jest.advanceTimersByTime(1000);
      expectIdleTimeoutWarningToast(notifications);
    });

    test(`shows lifespan warning toast`, async () => {
      const sessionInfo = {
        now,
        idleTimeoutExpiration: null,
        lifespanExpiration: now + 2 * 60 * 1000,
        provider: { type: 'basic', name: 'basic1' },
      };
      http.fetch.mockResolvedValue(sessionInfo);
      await sessionTimeout.start();

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      jest.advanceTimersByTime(55 * 1000);
      expectLifespanWarningToast(notifications);
    });

    test(`shows lifespan warning toast even for large timeouts`, async () => {
      const sessionInfo = {
        ...defaultSessionInfo,
        idleTimeoutExpiration: null,
        lifespanExpiration: now + 5_000_000_000,
      };
      http.fetch.mockResolvedValue(sessionInfo);
      await sessionTimeout.start();

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      jest.advanceTimersByTime(5_000_000_000 - 66 * 1000);
      expectNoWarningToast(notifications);

      jest.advanceTimersByTime(1000);
      expectLifespanWarningToast(notifications);
    });

    test(`extend only results in an HTTP call if a warning is shown`, async () => {
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalledTimes(1);

      await sessionTimeout.extend('/foo');
      expect(http.fetch).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(54 * 1000);
      expect(http.fetch).toHaveBeenCalledTimes(2);
      expectNoWarningToast(notifications);

      await sessionTimeout.extend('/foo');
      expect(http.fetch).toHaveBeenCalledTimes(2);
      jest.advanceTimersByTime(10 * 1000);
      expectIdleTimeoutWarningToast(notifications);

      await sessionTimeout.extend('/foo');
      expect(http.fetch).toHaveBeenCalledTimes(3);
    });

    test(`extend does not result in an HTTP call if a lifespan warning is shown`, async () => {
      const sessionInfo = {
        now,
        idleTimeoutExpiration: null,
        lifespanExpiration: now + 2 * 60 * 1000,
        provider: { type: 'basic', name: 'basic1' },
      };
      http.fetch.mockResolvedValue(sessionInfo);
      await sessionTimeout.start();

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      jest.advanceTimersByTime(55 * 1000);
      expectLifespanWarningToast(notifications);

      expect(http.fetch).toHaveBeenCalledTimes(1);
      await sessionTimeout.extend('/foo');
      expect(http.fetch).toHaveBeenCalledTimes(1);
    });

    test(`extend hides displayed warning toast`, async () => {
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalledTimes(1);

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      const elapsed = 55 * 1000;
      jest.advanceTimersByTime(elapsed);
      expectIdleTimeoutWarningToast(notifications);

      http.fetch.mockResolvedValue({
        now: now + elapsed,
        idleTimeoutExpiration: now + elapsed + 2 * 60 * 1000,
        lifespanExpiration: null,
        provider: { type: 'basic', name: 'basic1' },
      });
      await sessionTimeout.extend('/foo');
      expect(http.fetch).toHaveBeenCalledTimes(3);
      expectWarningToastHidden(notifications, toast);
    });

    test(`extend does nothing for session-related routes`, async () => {
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalledTimes(1);

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      const elapsed = 55 * 1000;
      jest.advanceTimersByTime(elapsed);
      expect(http.fetch).toHaveBeenCalledTimes(2);
      expectIdleTimeoutWarningToast(notifications);

      await sessionTimeout.extend('/internal/security/session');
      expect(http.fetch).toHaveBeenCalledTimes(2);
    });

    test(`checks for updated session info before the warning displays`, async () => {
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalledTimes(1);

      // we check for updated session info 1 second before the warning is shown
      const elapsed = 54 * 1000;
      jest.advanceTimersByTime(elapsed);
      expect(http.fetch).toHaveBeenCalledTimes(2);
    });

    test('clicking "extend" causes a new HTTP request (which implicitly extends the session)', async () => {
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalledTimes(1);

      // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
      jest.advanceTimersByTime(55 * 1000);
      expect(http.fetch).toHaveBeenCalledTimes(2);
      expectIdleTimeoutWarningToast(notifications);

      const toastInput = notifications.toasts.add.mock.calls[0][0];
      expect(toastInput).toHaveProperty('text');
      const mountPoint = (toastInput as any).text;
      const wrapper = mountWithIntl(mountPoint.__reactMount__);
      wrapper.find('EuiButton[data-test-subj="refreshSessionButton"]').simulate('click');
      expect(http.fetch).toHaveBeenCalledTimes(3);
    });

    test('when the session timeout is shorter than 65 seconds, display the warning immediately and for a shorter duration', async () => {
      http.fetch.mockResolvedValue({
        now,
        idleTimeoutExpiration: now + 64 * 1000,
        lifespanExpiration: null,
        provider: { type: 'basic', name: 'basic1' },
      });
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalled();

      jest.advanceTimersByTime(0);
      expectIdleTimeoutWarningToast(notifications, 59 * 1000);
    });
  });

  describe('session expiration', () => {
    test(`expires the session 5 seconds before it really expires`, async () => {
      await sessionTimeout.start();

      jest.advanceTimersByTime(114 * 1000);
      expect(sessionExpired.logout).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1 * 1000);
      expect(sessionExpired.logout).toHaveBeenCalled();
    });

    test(`expires the session 5 seconds before it really expires even for large timeouts`, async () => {
      http.fetch.mockResolvedValue({
        ...defaultSessionInfo,
        idleTimeoutExpiration: now + 5_000_000_000,
      });

      await sessionTimeout.start();

      jest.advanceTimersByTime(5_000_000_000 - 6000);
      expect(sessionExpired.logout).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(sessionExpired.logout).toHaveBeenCalled();
    });

    test(`extend delays the expiration`, async () => {
      await sessionTimeout.start();
      expect(http.fetch).toHaveBeenCalledTimes(1);

      const elapsed = 114 * 1000;
      jest.advanceTimersByTime(elapsed);
      expect(http.fetch).toHaveBeenCalledTimes(2);
      expectIdleTimeoutWarningToast(notifications);

      const sessionInfo = {
        now: now + elapsed,
        idleTimeoutExpiration: now + elapsed + 2 * 60 * 1000,
        lifespanExpiration: null,
        provider: { type: 'basic', name: 'basic1' },
      };
      http.fetch.mockResolvedValue(sessionInfo);
      await sessionTimeout.extend('/foo');
      expect(http.fetch).toHaveBeenCalledTimes(3);
      // eslint-disable-next-line dot-notation
      expect(sessionTimeout['sessionInfo']).toEqual(sessionInfo);

      // at this point, the session is good for another 120 seconds
      jest.advanceTimersByTime(114 * 1000);
      expect(sessionExpired.logout).not.toHaveBeenCalled();

      // because "extend" results in an async request and HTTP call, there is a slight delay when timers are updated
      // so we need an extra 100ms of padding for this test to ensure that logout has been called
      jest.advanceTimersByTime(1 * 1000 + 100);
      expect(sessionExpired.logout).toHaveBeenCalled();
    });

    test(`if the session timeout is shorter than 5 seconds, expire session immediately`, async () => {
      http.fetch.mockResolvedValue({
        now,
        idleTimeoutExpiration: now + 4 * 1000,
        lifespanExpiration: null,
        provider: { type: 'basic', name: 'basic1' },
      });
      await sessionTimeout.start();

      jest.advanceTimersByTime(0);
      expect(sessionExpired.logout).toHaveBeenCalled();
    });

    test(`'null' sessionTimeout never logs you out`, async () => {
      http.fetch.mockResolvedValue({ now, idleTimeoutExpiration: null, lifespanExpiration: null });
      await sessionTimeout.start();

      jest.advanceTimersByTime(Number.MAX_VALUE);
      expect(sessionExpired.logout).not.toHaveBeenCalled();
    });
  });
});
