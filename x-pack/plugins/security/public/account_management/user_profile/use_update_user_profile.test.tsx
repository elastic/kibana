/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject, first, lastValueFrom } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';

import { getUseUpdateUserProfile } from './use_update_user_profile';
import { UserProfileAPIClient } from './user_profile_api_client';

const { notifications, http } = coreMock.createStart();
const userProfileApiClient = new UserProfileAPIClient(http);
const useUpdateUserProfile = getUseUpdateUserProfile({
  apiClient: userProfileApiClient,
  notifications,
});

describe('useUpdateUserProfile', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(userProfileApiClient, 'update');
    http.get.mockReset();
    http.post.mockReset().mockResolvedValue(undefined);
    notifications.toasts.addSuccess.mockReset();
  });

  afterEach(() => {
    spy.mockRestore();
  });

  test('should call the apiClient with the updated user profile data', async () => {
    const { result } = renderHook(() => useUpdateUserProfile());
    const { update } = result.current;

    await act(async () => {
      update({ userSettings: { darkMode: 'dark' } });
    });

    expect(spy).toHaveBeenCalledWith({ userSettings: { darkMode: 'dark' } });
  });

  test('should update the isLoading state while updating', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useUpdateUserProfile());
    const { update } = result.current;
    const httpPostDone = new BehaviorSubject(false);

    http.post.mockImplementationOnce(async () => {
      await lastValueFrom(httpPostDone.pipe(first((v) => v === true)));
    });

    expect(result.current.isLoading).toBeFalsy();

    await act(async () => {
      update({ userSettings: { darkMode: 'dark' } });
    });

    expect(result.current.isLoading).toBeTruthy();

    httpPostDone.next(true); // Resolve the http.post promise
    await waitForNextUpdate();

    expect(result.current.isLoading).toBeFalsy();
  });

  test('should show a success notification by default', async () => {
    const { result } = renderHook(() => useUpdateUserProfile());
    const { update } = result.current;

    await act(async () => {
      await update({ userSettings: { darkMode: 'dark' } });
    });

    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(
      {
        title: 'Profile updated',
      },
      {} // toast options
    );
  });

  test('should show a notification with reload page button when refresh is required', async () => {
    const pageReloadChecker = () => {
      return true;
    };

    const { result } = renderHook(() =>
      useUpdateUserProfile({
        pageReloadChecker,
      })
    );
    const { update } = result.current;

    await act(async () => {
      await update({ userSettings: { darkMode: 'dark' } });
    });

    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(
      {
        title: 'Profile updated',
        text: expect.any(Function), // React node
      },
      {
        toastLifeTimeMs: 300000, // toast options
      }
    );
  });

  test('should pass the previous and next user profile data to the pageReloadChecker', async () => {
    const pageReloadChecker = jest.fn();

    const initialValue = { foo: 'bar' };
    http.get.mockReset().mockResolvedValue({ data: initialValue });
    const userProfileApiClient2 = new UserProfileAPIClient(http);
    await userProfileApiClient2.getCurrent(); // Sets the initial value of the userProfile$ Observable

    const { result } = renderHook(() =>
      getUseUpdateUserProfile({
        apiClient: userProfileApiClient2,
        notifications,
      })({
        pageReloadChecker,
      })
    );
    const { update } = result.current;

    const nextValue = { userSettings: { darkMode: 'light' as const } };
    await act(async () => {
      await update(nextValue);
    });

    expect(pageReloadChecker).toHaveBeenCalledWith(initialValue, nextValue);
  });
});
