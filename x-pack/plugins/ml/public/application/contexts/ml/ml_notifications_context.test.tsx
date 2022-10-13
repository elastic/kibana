/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { of, throwError } from 'rxjs';
import { useMlNotifications, MlNotificationsContextProvider } from './ml_notifications_context';
import { useStorage } from '../storage';
import { useMlApiContext } from '../kibana';

const mockCountMessages = jest.fn(() => {
  return of({ info: 1, error: 0, warning: 0 });
});

jest.mock('../kibana', () => ({
  useMlApiContext: jest.fn(() => {
    return {
      notifications: {
        countMessages$: mockCountMessages,
      },
    };
  }),
}));

const mockSetStorageValue = jest.fn();
jest.mock('../storage', () => ({
  useStorage: jest.fn(() => {
    return [undefined, mockSetStorageValue];
  }),
}));

describe('useMlNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(1663945337063);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('returns the default values', () => {
    const { result } = renderHook(useMlNotifications, { wrapper: MlNotificationsContextProvider });
    expect(result.current.notificationsCounts).toEqual({ info: 0, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(null);
    expect(result.current.lastCheckedAt).toEqual(undefined);
  });

  test('starts only one subscription on mount', () => {
    const { rerender } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
  });

  test('starts polling for notifications with a 1 minute interval during the last week by default ', () => {
    const { result } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1663340537063 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1663340537063);
    expect(result.current.lastCheckedAt).toEqual(undefined);

    act(() => {
      mockCountMessages.mockReturnValueOnce(of({ info: 1, error: 2, warning: 0 }));
      jest.advanceTimersByTime(60000);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(2);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1663340537063 + 60000 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 2, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1663340537063 + 60000);
    expect(result.current.lastCheckedAt).toEqual(undefined);
  });

  test('starts polling for notifications with a 1 minute interval using the lastCheckedAt from storage', () => {
    (useStorage as jest.MockedFunction<typeof useStorage>).mockReturnValue([
      1664551009292,
      mockSetStorageValue,
    ]);
    const { result } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1664551009292 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1664551009292);
    expect(result.current.lastCheckedAt).toEqual(1664551009292);
  });

  test('switches to polling with the lastCheckedAt from storage when available', () => {
    (useStorage as jest.MockedFunction<typeof useStorage>).mockReturnValue([
      undefined,
      mockSetStorageValue,
    ]);
    const { result, rerender } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1663340537063 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1663340537063);
    expect(result.current.lastCheckedAt).toEqual(undefined);

    act(() => {
      (useStorage as jest.MockedFunction<typeof useStorage>).mockReturnValue([
        1664551009292,
        mockSetStorageValue,
      ]);
    });

    rerender();

    expect(mockCountMessages).toHaveBeenCalledTimes(2);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1664551009292 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1664551009292);
    expect(result.current.lastCheckedAt).toEqual(1664551009292);
  });

  test('retries polling on error with 1m delay', () => {
    const mockCountMessagesError = jest.fn(() => throwError(() => new Error('Cluster is down')));

    (useMlApiContext as jest.MockedFunction<typeof useMlApiContext>).mockImplementation(() => {
      return {
        notifications: {
          countMessages$: mockCountMessagesError,
        },
      } as unknown as ReturnType<typeof useMlApiContext>;
    });

    renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(mockCountMessagesError).toHaveBeenCalledTimes(1);
    expect(mockCountMessagesError).toHaveBeenCalledWith({ lastCheckedAt: 1664551009292 });

    act(() => {
      // ticks 4 minutes
      jest.advanceTimersByTime(60000 * 4);
    });

    expect(mockCountMessagesError).toHaveBeenCalledTimes(4);
    expect(mockCountMessagesError).toHaveBeenCalledWith({ lastCheckedAt: 1664551009292 });
  });
});
