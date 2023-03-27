/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useLastPageUserActions } from './use_user_actions_last_page';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import { defaultUseFindCaseUserActions } from '../case_view/mocks';
import { basicCase } from '../../containers/mock';
import type { CaseUserActionsStats } from '../../containers/types';

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const userActionsStats: CaseUserActionsStats = {
  total: 25,
  totalComments: 9,
  totalOtherActions: 16,
};

jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../common/lib/kibana');

const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;

describe('useLastPageUserActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
  });

  it('renders correctly', async () => {
    const { result, waitFor } = renderHook(() =>
      useLastPageUserActions({
        lastPage: 5,
        userActivityQueryParams,
        userActionsStats,
        caseId: basicCase.id,
        showBottomList: true,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 5 },
      true
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          isLoadingLastPageUserActions: false,
          lastPageUserActions: defaultUseFindCaseUserActions.data.userActions,
        })
      );
    });
  });

  it('calls find API hook with enabled as false when showBottomList is false', async () => {
    renderHook(() =>
      useLastPageUserActions({
        lastPage: 5,
        userActivityQueryParams,
        userActionsStats,
        caseId: basicCase.id,
        showBottomList: false,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 5 },
      false
    );
  });

  it('returns loading state correctly', async () => {
    useFindCaseUserActionsMock.mockReturnValue({ isLoading: true });

    const { result, waitFor } = renderHook(() =>
      useLastPageUserActions({
        lastPage: 1,
        userActivityQueryParams,
        userActionsStats,
        caseId: basicCase.id,
        showBottomList: true,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 1 },
      true
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          isLoadingLastPageUserActions: true,
          lastPageUserActions: [],
        })
      );
    });
  });

  describe('rerenders', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
    });

    it('rerenders correctly when last page changed', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useLastPageUserActions(props);
        },
        {
          initialProps: {
            lastPage: 5,
            userActivityQueryParams,
            userActionsStats,
            caseId: basicCase.id,
            showBottomList: true,
          },
        }
      );

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, page: 5 },
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            isLoadingLastPageUserActions: false,
            lastPageUserActions: defaultUseFindCaseUserActions.data.userActions,
          })
        );
      });

      rerender({
        lastPage: 6,
        userActionsStats,
        caseId: basicCase.id,
        showBottomList: true,
        userActivityQueryParams,
      });

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, page: 6 },
        true
      );
    });

    it('rerenders correctly when activity params changed', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useLastPageUserActions(props);
        },
        {
          initialProps: {
            lastPage: 5,
            userActivityQueryParams,
            userActionsStats,
            caseId: basicCase.id,
            showBottomList: true,
          },
        }
      );

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, page: 5 },
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            isLoadingLastPageUserActions: false,
            lastPageUserActions: defaultUseFindCaseUserActions.data.userActions,
          })
        );
      });

      rerender({
        lastPage: 5,
        userActionsStats,
        caseId: basicCase.id,
        showBottomList: true,
        userActivityQueryParams: { ...userActivityQueryParams, type: 'user' },
      });

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, type: 'user', page: 5 },
        true
      );
    });

    it('rerenders correctly when actions stats changed and sort order is ascending', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useLastPageUserActions(props);
        },
        {
          initialProps: {
            lastPage: 5,
            userActivityQueryParams,
            userActionsStats,
            caseId: basicCase.id,
            showBottomList: true,
          },
        }
      );

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, page: 5 },
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            isLoadingLastPageUserActions: false,
            lastPageUserActions: defaultUseFindCaseUserActions.data.userActions,
          })
        );
      });

      rerender({
        lastPage: 5,
        userActionsStats: {
          ...userActionsStats,
          total: 26,
          totalComments: 10,
          totalOtherActions: 16,
        },
        caseId: basicCase.id,
        showBottomList: true,
        userActivityQueryParams,
      });

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, page: 5 },
        true
      );
    });

    it('does not rerender when action params changed but sort order is descending', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useLastPageUserActions(props);
        },
        {
          initialProps: {
            lastPage: 5,
            userActivityQueryParams: {
              ...userActivityQueryParams,
              sortOrder: 'desc' as UserActivityParams['sortOrder'],
            },
            userActionsStats,
            caseId: basicCase.id,
            showBottomList: true,
          },
        }
      );

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, sortOrder: 'desc', page: 5 },
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            isLoadingLastPageUserActions: false,
            lastPageUserActions: defaultUseFindCaseUserActions.data.userActions,
          })
        );
      });

      rerender({
        lastPage: 5,
        userActionsStats: {
          ...userActionsStats,
          total: 26,
          totalComments: 10,
          totalOtherActions: 16,
        },
        caseId: basicCase.id,
        showBottomList: true,
        userActivityQueryParams: { ...userActivityQueryParams, sortOrder: 'desc' },
      });

      expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, sortOrder: 'desc', page: 5 },
        false
      );
    });
  });
});
