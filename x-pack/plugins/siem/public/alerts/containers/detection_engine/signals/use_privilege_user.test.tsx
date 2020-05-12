/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePrivilegeUser, ReturnPrivilegeUser } from './use_privilege_user';
import * as api from './api';

jest.mock('./api');

describe('usePrivilegeUser', () => {
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPrivilegeUser>(() =>
        usePrivilegeUser()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: null,
        hasIndexManage: null,
        hasIndexWrite: null,
        isAuthenticated: null,
        loading: true,
      });
    });
  });

  test('fetch user privilege', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPrivilegeUser>(() =>
        usePrivilegeUser()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: true,
        hasIndexWrite: true,
        isAuthenticated: true,
        loading: false,
      });
    });
  });

  test('if there is an error when fetching user privilege, we should get back false for every properties', async () => {
    const spyOnGetUserPrivilege = jest.spyOn(api, 'getUserPrivilege');
    spyOnGetUserPrivilege.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPrivilegeUser>(() =>
        usePrivilegeUser()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: false,
        hasIndexManage: false,
        hasIndexWrite: false,
        isAuthenticated: false,
        loading: false,
      });
    });
  });
});
