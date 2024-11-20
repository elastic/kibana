/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useUserPermissions } from './use_user_permissions';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

jest.mock('../cases_context/use_cases_context');
const mockUseCasesContext = useCasesContext as jest.Mock;

describe('useUserPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canUpdate permission', () => {
    it('should return true when user has update permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: true,
          reopenCase: false,
          createComment: false,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      expect(result.current.canUpdate).toBe(true);
    });

    it('should return false when user lacks update permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: false,
          reopenCase: true,
          createComment: true,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      expect(result.current.canUpdate).toBe(false);
    });
  });

  describe('canReopenCase permission', () => {
    it('should return true when user has reopenCase permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: false,
          reopenCase: true,
          createComment: false,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      expect(result.current.canReopenCase).toBe(true);
    });

    it('should return false when user lacks reopenCase permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: true,
          reopenCase: false,
          createComment: true,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      expect(result.current.canReopenCase).toBe(false);
    });
  });

  describe('getCanAddUserComments permission', () => {
    it('should return false when activity type is "action" regardless of createComment permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: false,
          reopenCase: false,
          createComment: true,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      const userActivityParams: UserActivityParams = {
        page: 1,
        perPage: 10,
        sortOrder: 'asc',
        type: 'action',
      };

      expect(result.current.getCanAddUserComments(userActivityParams)).toBe(false);
    });

    it('should return true when type is not "action" and user has createComment permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: false,
          reopenCase: false,
          createComment: true,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      const userActivityParams: UserActivityParams = {
        page: 1,
        perPage: 10,
        sortOrder: 'asc',
        type: 'user',
      };

      expect(result.current.getCanAddUserComments(userActivityParams)).toBe(true);
    });

    it('should return false when type is not "action" but user lacks createComment permission', () => {
      mockUseCasesContext.mockReturnValue({
        permissions: {
          update: true,
          reopenCase: true,
          createComment: false,
          all: false,
          read: true,
          create: false,
          delete: false,
          push: false,
          connectors: true,
          settings: false,
        },
      });

      const { result } = renderHook(() => useUserPermissions());
      const userActivityParams: UserActivityParams = {
        page: 1,
        perPage: 10,
        sortOrder: 'asc',
        type: 'user',
      };

      expect(result.current.getCanAddUserComments(userActivityParams)).toBe(false);
    });
  });

  it('should maintain stable references to memoized values when permissions do not change', () => {
    const permissions = {
      update: true,
      reopenCase: true,
      createComment: true,
      all: false,
      read: true,
      create: false,
      delete: false,
      push: false,
      connectors: true,
      settings: false,
    };

    mockUseCasesContext.mockReturnValue({ permissions });

    const { result, rerender } = renderHook(() => useUserPermissions());

    const initialCanUpdate = result.current.canUpdate;
    const initialCanReopenCase = result.current.canReopenCase;
    const initialGetCanAddUserComments = result.current.getCanAddUserComments;

    rerender();

    expect(result.current.canUpdate).toBe(initialCanUpdate);
    expect(result.current.canReopenCase).toBe(initialCanReopenCase);
    expect(result.current.getCanAddUserComments).toBe(initialGetCanAddUserComments);
  });

  it('should update memoized values when permissions change', () => {
    const initialPermissions = {
      update: true,
      reopenCase: true,
      createComment: true,
      all: false,
      read: true,
      create: false,
      delete: false,
      push: false,
      connectors: true,
      settings: false,
    };

    mockUseCasesContext.mockReturnValue({ permissions: initialPermissions });

    const { result, rerender } = renderHook(() => useUserPermissions());

    const initialCanUpdate = result.current.canUpdate;
    const initialCanReopenCase = result.current.canReopenCase;
    const initialGetCanAddUserComments = result.current.getCanAddUserComments;

    const newPermissions = {
      update: false,
      reopenCase: false,
      createComment: true,
      all: false,
      read: true,
      create: false,
      delete: false,
      push: false,
      connectors: true,
      settings: false,
    };

    mockUseCasesContext.mockReturnValue({ permissions: newPermissions });
    rerender();

    expect(result.current.canUpdate).not.toBe(initialCanUpdate);
    expect(result.current.canReopenCase).not.toBe(initialCanReopenCase);
    expect(result.current.getCanAddUserComments).toBe(initialGetCanAddUserComments);
  });
});
