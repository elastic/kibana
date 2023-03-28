/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useUserActionsPagination } from './use_user_actions_pagination';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { defaultInfiniteUseFindCaseUserActions } from '../case_view/mocks';
import { basicCase } from '../../containers/mock';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const userActionsStats = {
  total: 25,
  totalComments: 9,
  totalOtherActions: 16,
};

jest.mock('../../containers/use_infinite_find_case_user_actions');
jest.mock('../../common/lib/kibana');

const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;

describe('useUserActionsPagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
  });

  it('renders expandable option correctly when user actions are more than 10', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats,
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 3,
          showBottomList: true,
          isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
          infiniteCaseUserActions: defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
          hasNextPage: defaultInfiniteUseFindCaseUserActions.hasNextPage,
          fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
        })
      );
    });
  });

  it('returns correct last page', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats: { total: 38, totalComments: 17, totalOtherActions: 21 },
        userActivityQueryParams: {
          ...userActivityQueryParams,
          type: 'user',
        },
        caseId: basicCase.id,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 2,
        })
      );
    });
  });

  it('renders less than 10 user actions correctly', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats: { total: 9, totalComments: 3, totalOtherActions: 6 },
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );
    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 1,
          showBottomList: false,
          isLoadingInfiniteUserActions: false,
          infiniteCaseUserActions: defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
          hasNextPage: false,
        })
      );
    });
  });

  it('returns loading state correctly', async () => {
    useInfiniteFindCaseUserActionsMock.mockReturnValue({ isLoading: true });

    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats,
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 3,
          showBottomList: true,
          isLoadingInfiniteUserActions: true,
          infiniteCaseUserActions: [],
          hasNextPage: undefined,
          fetchNextPage: undefined,
        })
      );
    });
  });

  it('return hasNextPage as false when it has less than 10 user actions', async () => {
    useInfiniteFindCaseUserActionsMock.mockReturnValue({
      ...defaultInfiniteUseFindCaseUserActions,
      data: {
        perPageParams: undefined,
        pages: { total: 25, perPage: 10, page: 1, userActions: [] },
      },
    });

    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats: { total: 9, totalComments: 3, totalOtherActions: 6 },
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 1,
          showBottomList: false,
          isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
          infiniteCaseUserActions: [],
          hasNextPage: false,
          fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
        })
      );
    });
  });

  describe('rerenders', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
    });

    it('rerenders correctly when user activity params changed', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useUserActionsPagination(props);
        },
        {
          initialProps: {
            userActivityQueryParams,
            userActionsStats,
            caseId: basicCase.id,
          },
        }
      );

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        userActivityQueryParams,
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            lastPage: 3,
            showBottomList: true,
            isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
            infiniteCaseUserActions:
              defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
            hasNextPage: defaultInfiniteUseFindCaseUserActions.hasNextPage,
            fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
          })
        );
      });

      rerender({
        userActionsStats,
        caseId: basicCase.id,
        userActivityQueryParams: { ...userActivityQueryParams, type: 'user' },
      });

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, type: 'user' },
        true
      );
    });

    it('rerenders correctly when last page is 1', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useUserActionsPagination(props);
        },
        {
          initialProps: {
            userActivityQueryParams,
            userActionsStats: { total: 9, totalComments: 3, totalOtherActions: 6 },
            caseId: basicCase.id,
          },
        }
      );

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        userActivityQueryParams,
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            lastPage: 1,
            showBottomList: false,
            isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
            infiniteCaseUserActions:
              defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
            hasNextPage: false,
            fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
          })
        );
      });

      rerender({
        userActionsStats: { total: 10, totalComments: 4, totalOtherActions: 6 },
        caseId: basicCase.id,
        userActivityQueryParams,
      });

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        userActivityQueryParams,
        true
      );
    });

    it('rerenders correctly when action params changed and sort order is descending', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useUserActionsPagination(props);
        },
        {
          initialProps: {
            userActivityQueryParams: {
              ...userActivityQueryParams,
              sortOrder: 'desc' as UserActivityParams['sortOrder'],
            },
            userActionsStats,
            caseId: basicCase.id,
          },
        }
      );

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, sortOrder: 'desc' },
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            lastPage: 3,
            showBottomList: true,
            isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
            infiniteCaseUserActions:
              defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
            hasNextPage: defaultInfiniteUseFindCaseUserActions.hasNextPage,
            fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
          })
        );
      });

      rerender({
        userActionsStats: {
          ...userActionsStats,
          total: 26,
          totalComments: 10,
          totalOtherActions: 16,
        },
        caseId: basicCase.id,
        userActivityQueryParams: { ...userActivityQueryParams, sortOrder: 'desc' },
      });

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams, sortOrder: 'desc' },
        true
      );
    });

    it('does not rerender when action params changed and sort order is ascending', async () => {
      const { result, waitFor, rerender } = renderHook(
        (props) => {
          return useUserActionsPagination(props);
        },
        {
          initialProps: {
            userActivityQueryParams,
            userActionsStats,
            caseId: basicCase.id,
          },
        }
      );

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams },
        true
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            lastPage: 3,
            showBottomList: true,
            isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
            infiniteCaseUserActions:
              defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
            hasNextPage: defaultInfiniteUseFindCaseUserActions.hasNextPage,
            fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
          })
        );
      });

      rerender({
        userActionsStats: {
          ...userActionsStats,
          total: 26,
          totalComments: 10,
          totalOtherActions: 16,
        },
        caseId: basicCase.id,
        userActivityQueryParams: { ...userActivityQueryParams },
      });

      expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
        basicCase.id,
        { ...userActivityQueryParams },
        false
      );
    });
  });
});
