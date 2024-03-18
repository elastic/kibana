/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { useListsIndex } from './use_lists_index';
import { useListsPrivileges } from './use_lists_privileges';
import { getUseListsIndexMock } from './use_lists_index.mock';
import { getUseListsPrivilegesMock } from './use_lists_privileges.mock';
import { useListsConfig } from './use_lists_config';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_lists_index');
jest.mock('./use_lists_privileges');
jest.mock('../../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('useListsConfig', () => {
  let listsIndexMock: ReturnType<typeof getUseListsIndexMock>;
  let listsPrivilegesMock: ReturnType<typeof getUseListsPrivilegesMock>;

  beforeEach(() => {
    listsIndexMock = getUseListsIndexMock();
    listsPrivilegesMock = getUseListsPrivilegesMock();
    (useListsIndex as jest.Mock).mockReturnValue(listsIndexMock);
    (useListsPrivileges as jest.Mock).mockReturnValue(listsPrivilegesMock);
    useUserPrivilegesMock.mockReturnValue({
      detectionEnginePrivileges: { result: { cluster: { manage: false } } },
    });
  });

  it("returns the user's write permissions", () => {
    listsPrivilegesMock.canWriteIndex = false;
    const { result } = renderHook(() => useListsConfig());
    expect(result.current.canWriteIndex).toBe(false);

    listsPrivilegesMock.canWriteIndex = true;
    const { result: result2 } = renderHook(() => useListsConfig());
    expect(result2.current.canWriteIndex).toBe(true);
  });

  describe('when lists are disabled', () => {
    beforeEach(() => {
      useKibana().services.lists = undefined;
    });

    it('indicates that lists are not enabled, and need configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.enabled).toBe(false);
      expect(result.current.needsConfiguration).toBe(true);
    });
  });

  describe('when lists are enabled but indexes do not exist', () => {
    beforeEach(() => {
      useKibana().services.lists = {};
      listsIndexMock.indexExists = false;
    });

    it('needs configuration if the user cannot manage indexes', () => {
      listsPrivilegesMock.canManageIndex = false;

      const { result } = renderHook(() => useListsConfig());
      expect(result.current.needsConfiguration).toBe(true);
      expect(listsIndexMock.createIndex).not.toHaveBeenCalled();
    });

    it('attempts to create the indexes if the user can manage indexes and have cluster privilege', () => {
      useUserPrivilegesMock.mockReturnValue({
        detectionEnginePrivileges: { result: { cluster: { manage: true } } },
      });
      listsPrivilegesMock.canManageIndex = true;

      renderHook(() => useListsConfig());
      expect(listsIndexMock.createIndex).toHaveBeenCalled();
    });

    it('does not call create index if the user can manage indexes but not cluster privilege', () => {
      listsPrivilegesMock.canManageIndex = true;

      renderHook(() => useListsConfig());
      expect(listsIndexMock.createIndex).not.toHaveBeenCalled();
    });

    it('does not call create index if the user can manage indexes and have cluster privilege, but index loading', () => {
      useUserPrivilegesMock.mockReturnValue({
        detectionEnginePrivileges: { result: { cluster: { manage: true } } },
      });
      listsPrivilegesMock.canManageIndex = true;
      (useListsIndex as jest.Mock).mockReturnValue({ ...listsIndexMock, loading: true });

      renderHook(() => useListsConfig());
      expect(listsIndexMock.createIndex).not.toHaveBeenCalled();
    });
  });

  describe('when lists are enabled and indexes exist', () => {
    beforeEach(() => {
      useKibana().services.lists = {};
      listsIndexMock.indexExists = true;
    });

    it('does not need configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.needsConfiguration).toBe(false);
    });
  });

  describe('create index privileges', () => {
    it('canCreateIndex is true, when user can manage indices and cluster', () => {
      useUserPrivilegesMock.mockReturnValue({
        detectionEnginePrivileges: { result: { cluster: { manage: true } } },
      });
      listsPrivilegesMock.canManageIndex = true;

      const { result } = renderHook(() => useListsConfig());
      expect(result.current.canCreateIndex).toBe(true);
    });

    it('canCreateIndex is false, when user can manage indices and can not manage cluster', () => {
      useUserPrivilegesMock.mockReturnValue({
        detectionEnginePrivileges: { result: { cluster: { manage: false } } },
      });
      listsPrivilegesMock.canManageIndex = true;

      const { result } = renderHook(() => useListsConfig());
      expect(result.current.canCreateIndex).toBe(false);
    });

    it('canCreateIndex is false, when user can not manage indices and can manage cluster', () => {
      useUserPrivilegesMock.mockReturnValue({
        detectionEnginePrivileges: { result: { cluster: { manage: true } } },
      });
      listsPrivilegesMock.canManageIndex = false;

      const { result } = renderHook(() => useListsConfig());
      expect(result.current.canCreateIndex).toBe(false);
    });
  });
});
