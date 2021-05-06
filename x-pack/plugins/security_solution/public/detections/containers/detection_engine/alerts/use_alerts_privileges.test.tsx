/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import produce from 'immer';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useUserPrivileges } from '../../../components/user_privileges';
import { Privilege } from './types';
import { UseAlertsPrivelegesReturn, useAlertsPrivileges } from './use_alerts_privileges';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock<ReturnType<typeof useUserPrivileges>>;

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

const userPrivilegesInitial: ReturnType<typeof useUserPrivileges> = {
  detectionEnginePrivileges: {
    loading: false,
    result: undefined,
    error: undefined,
  },
  listPrivileges: {
    loading: false,
    result: undefined,
    error: undefined,
  },
};

describe('usePrivilegeUser', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.resetAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    useUserPrivilegesMock.mockReturnValue(userPrivilegesInitial);
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, UseAlertsPrivelegesReturn>(() =>
        useAlertsPrivileges()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: null,
        hasIndexManage: null,
        hasIndexRead: null,
        hasIndexMaintenance: null,
        hasIndexWrite: null,
        hasIndexUpdateDelete: null,
        isAuthenticated: null,
        loading: false,
      });
    });
  });

  test('if there is an error when fetching user privilege, we should get back false for every properties', async () => {
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.error = new Error('Something went wrong');
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, UseAlertsPrivelegesReturn>(() =>
        useAlertsPrivileges()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: false,
        hasIndexManage: false,
        hasIndexMaintenance: false,
        hasIndexRead: false,
        hasIndexWrite: false,
        hasIndexUpdateDelete: false,
        isAuthenticated: false,
        loading: false,
      });
    });
  });

  test('returns "hasIndexManage" is false if the privilege does not have cluster manage', async () => {
    const privilegeWithClusterManage = produce(privilege, (draft) => {
      draft.cluster.manage = false;
    });
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.result = privilegeWithClusterManage;
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, UseAlertsPrivelegesReturn>(() =>
        useAlertsPrivileges()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: false,
        hasIndexMaintenance: true,
        hasIndexRead: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        isAuthenticated: true,
        loading: false,
      });
    });
  });

  test('returns "hasIndexManage" is true if the privilege has cluster manage', async () => {
    const userPrivileges = produce(userPrivilegesInitial, (draft) => {
      draft.detectionEnginePrivileges.result = privilege;
    });
    useUserPrivilegesMock.mockReturnValue(userPrivileges);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, UseAlertsPrivelegesReturn>(() =>
        useAlertsPrivileges()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        hasEncryptionKey: true,
        hasIndexManage: true,
        hasIndexMaintenance: true,
        hasIndexRead: true,
        hasIndexWrite: true,
        hasIndexUpdateDelete: true,
        isAuthenticated: true,
        loading: false,
      });
    });
  });
});
