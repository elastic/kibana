/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePrivilegeUser, ReturnPrivilegeUser } from './use_privilege_user';
import * as api from './api';
import { Privilege } from './types';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('usePrivilegeUser', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.resetAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPrivilegeUser>(() =>
        usePrivilegeUser()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: null,
        hasIndexManage: null,
        hasIndexMaintenance: null,
        hasIndexWrite: null,
        hasIndexUpdateDelete: null,
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
        hasIndexMaintenance: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
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
        hasIndexMaintenance: false,
        hasIndexWrite: false,
        hasIndexUpdateDelete: false,
        isAuthenticated: false,
        loading: false,
      });
    });
  });

  test('returns "hasIndexManage" is false if the privilege does not have cluster manage', async () => {
    const privilege: Privilege = {
      username: 'soc_manager',
      has_all_requested: false,
      cluster: {
        monitor_ml: false,
        manage_ccr: false,
        manage_index_templates: false,
        monitor_watcher: false,
        monitor_transform: false,
        read_ilm: false,
        manage_api_key: false,
        manage_security: false,
        manage_own_api_key: false,
        manage_saml: false,
        all: false,
        manage_ilm: false,
        manage_ingest_pipelines: false,
        read_ccr: false,
        manage_rollup: false,
        monitor: false,
        manage_watcher: false,
        manage: false,
        manage_transform: false,
        manage_token: false,
        manage_ml: false,
        manage_pipeline: false,
        monitor_rollup: false,
        transport_client: false,
        create_snapshot: false,
      },
      index: {
        '.siem-signals-default': {
          all: false,
          manage_ilm: true,
          read: true,
          create_index: true,
          read_cross_cluster: false,
          index: true,
          monitor: true,
          delete: true,
          manage: true,
          delete_index: true,
          create_doc: true,
          view_index_metadata: true,
          create: true,
          manage_follow_index: true,
          manage_leader_index: true,
          maintenance: true,
          write: true,
        },
      },
      application: {},
      is_authenticated: true,
      has_encryption_key: true,
    };
    const spyOnGetUserPrivilege = jest.spyOn(api, 'getUserPrivilege');
    spyOnGetUserPrivilege.mockImplementation(() => Promise.resolve(privilege));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPrivilegeUser>(() =>
        usePrivilegeUser()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: false,
        hasIndexMaintenance: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        isAuthenticated: true,
        loading: false,
      });
    });
  });

  test('returns "hasIndexManage" is true if the privilege has cluster manage', async () => {
    const privilege: Privilege = {
      username: 'soc_manager',
      has_all_requested: false,
      cluster: {
        monitor_ml: false,
        manage_ccr: false,
        manage_index_templates: false,
        monitor_watcher: false,
        monitor_transform: false,
        read_ilm: false,
        manage_api_key: false,
        manage_security: false,
        manage_own_api_key: false,
        manage_saml: false,
        all: false,
        manage_ilm: false,
        manage_ingest_pipelines: false,
        read_ccr: false,
        manage_rollup: false,
        monitor: false,
        manage_watcher: false,
        manage: true,
        manage_transform: false,
        manage_token: false,
        manage_ml: false,
        manage_pipeline: false,
        monitor_rollup: false,
        transport_client: false,
        create_snapshot: false,
      },
      index: {
        '.siem-signals-default': {
          all: false,
          manage_ilm: true,
          read: true,
          create_index: true,
          read_cross_cluster: false,
          index: true,
          monitor: true,
          delete: true,
          manage: true,
          delete_index: true,
          create_doc: true,
          view_index_metadata: true,
          create: true,
          manage_follow_index: true,
          manage_leader_index: true,
          maintenance: true,
          write: true,
        },
      },
      application: {},
      is_authenticated: true,
      has_encryption_key: true,
    };
    const spyOnGetUserPrivilege = jest.spyOn(api, 'getUserPrivilege');
    spyOnGetUserPrivilege.mockImplementation(() => Promise.resolve(privilege));
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnPrivilegeUser>(() =>
        usePrivilegeUser()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: true,
        hasIndexMaintenance: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        isAuthenticated: true,
        loading: false,
      });
    });
  });
});
