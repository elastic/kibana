/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana } from '../../../../common/lib/kibana';
import { useListsIndex } from './use_lists_index';
import { useListsPrivileges } from './use_lists_privileges';
import { getUseListsIndexMock } from './use_lists_index.mock';
import { getUseListsPrivilegesMock } from './use_lists_privileges.mock';
import { useListsConfig } from './use_lists_config';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_lists_index');
jest.mock('./use_lists_privileges');

describe('useListsConfig', () => {
  let listsIndexMock: ReturnType<typeof getUseListsIndexMock>;
  let listsPrivilegesMock: ReturnType<typeof getUseListsPrivilegesMock>;

  beforeEach(() => {
    listsIndexMock = getUseListsIndexMock();
    listsPrivilegesMock = getUseListsPrivilegesMock();
    (useListsIndex as jest.Mock).mockReturnValue(listsIndexMock);
    (useListsPrivileges as jest.Mock).mockReturnValue(listsPrivilegesMock);
  });

  it("returns the user's write permissions", () => {
    listsPrivilegesMock.canWriteIndex = false;
    const { result } = renderHook(() => useListsConfig());
    expect(result.current.canWriteIndex).toEqual(false);

    listsPrivilegesMock.canWriteIndex = true;
    const { result: result2 } = renderHook(() => useListsConfig());
    expect(result2.current.canWriteIndex).toEqual(true);
  });

  describe('when lists are disabled', () => {
    beforeEach(() => {
      useKibana().services.lists = undefined;
    });

    it('indicates that lists are not enabled, and need configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.enabled).toEqual(false);
      expect(result.current.needsConfiguration).toEqual(true);
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
      expect(result.current.needsConfiguration).toEqual(true);
      expect(listsIndexMock.createIndex).not.toHaveBeenCalled();
    });

    it('attempts to create the indexes if the user can manage indexes', () => {
      listsPrivilegesMock.canManageIndex = true;

      renderHook(() => useListsConfig());
      expect(listsIndexMock.createIndex).toHaveBeenCalled();
    });
  });

  describe('when lists are enabled and indexes exist', () => {
    beforeEach(() => {
      useKibana().services.lists = {};
      listsIndexMock.indexExists = true;
    });

    it('does not need configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.needsConfiguration).toEqual(false);
    });
  });
});
