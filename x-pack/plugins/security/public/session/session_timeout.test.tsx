/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { SessionTimeout } from './session_timeout';
import { createSessionExpiredMock } from './session_expired.mock';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

jest.useFakeTimers();

const expectNoWarningToast = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications']
) => {
  expect(notifications.toasts.add).not.toHaveBeenCalled();
};

const expectWarningToast = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications'],
  toastLifeTimeMS: number = 60000
) => {
  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect(notifications.toasts.add.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "color": "warning",
        "text": <SessionTimeoutWarning
          onRefreshSession={[Function]}
        />,
        "title": "Warning",
        "toastLifeTimeMs": ${toastLifeTimeMS},
      },
    ]
  `);
};

const expectWarningToastHidden = (
  notifications: ReturnType<typeof coreMock.createSetup>['notifications'],
  toast: symbol
) => {
  expect(notifications.toasts.remove).toHaveBeenCalledTimes(1);
  expect(notifications.toasts.remove).toHaveBeenCalledWith(toast);
};

describe('warning toast', () => {
  test(`shows session expiration warning toast`, () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(2 * 60 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
    jest.advanceTimersByTime(55 * 1000);
    expectWarningToast(notifications);
  });

  test(`extend delays the warning toast`, () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(2 * 60 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    jest.advanceTimersByTime(54 * 1000);
    expectNoWarningToast(notifications);

    sessionTimeout.extend();
    jest.advanceTimersByTime(54 * 1000);
    expectNoWarningToast(notifications);

    jest.advanceTimersByTime(1 * 1000);

    expectWarningToast(notifications);
  });

  test(`extend hides displayed warning toast`, () => {
    const { notifications, http } = coreMock.createSetup();
    const toast = Symbol();
    notifications.toasts.add.mockReturnValue(toast as any);
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(2 * 60 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
    jest.advanceTimersByTime(55 * 1000);
    expectWarningToast(notifications);

    sessionTimeout.extend();
    expectWarningToastHidden(notifications, toast);
  });

  test('clicking "extend" causes a new HTTP request (which implicitly extends the session)', () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(2 * 60 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    // we display the warning a minute before we expire the the session, which is 5 seconds before it actually expires
    jest.advanceTimersByTime(55 * 1000);
    expectWarningToast(notifications);

    expect(http.get).not.toHaveBeenCalled();
    const toastInput = notifications.toasts.add.mock.calls[0][0];
    expect(toastInput).toHaveProperty('text');
    const reactComponent = (toastInput as any).text;
    const wrapper = mountWithIntl(reactComponent);
    wrapper.find('EuiButton[data-test-subj="refreshSessionButton"]').simulate('click');
    expect(http.get).toHaveBeenCalled();
  });

  test('when the session timeout is shorter than 65 seconds, display the warning immediately and for a shorter duration', () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(64 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    jest.advanceTimersByTime(0);
    expectWarningToast(notifications, 59 * 1000);
  });
});

describe('session expiration', () => {
  test(`expires the session 5 seconds before it really expires`, () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(2 * 60 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    jest.advanceTimersByTime(114 * 1000);
    expect(sessionExpired.logout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1 * 1000);
    expect(sessionExpired.logout).toHaveBeenCalled();
  });

  test(`extend delays the expiration`, () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(2 * 60 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    jest.advanceTimersByTime(114 * 1000);

    sessionTimeout.extend();
    jest.advanceTimersByTime(114 * 1000);
    expect(sessionExpired.logout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1 * 1000);
    expect(sessionExpired.logout).toHaveBeenCalled();
  });

  test(`if the session timeout is shorter than 5 seconds, expire session immediately`, () => {
    const { notifications, http } = coreMock.createSetup();
    const sessionExpired = createSessionExpiredMock();
    const sessionTimeout = new SessionTimeout(4 * 1000, notifications, sessionExpired, http);

    sessionTimeout.extend();
    jest.advanceTimersByTime(0);
    expect(sessionExpired.logout).toHaveBeenCalled();
  });
});
