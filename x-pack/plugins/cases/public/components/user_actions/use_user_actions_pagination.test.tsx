/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useUserActionsPagination } from './use_user_actions_pagination';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import {
  defaultUseFindCaseUserActions,
  defaultInfiniteUseFindCaseUserActions,
} from '../case_view/mocks';
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
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../common/lib/kibana');

const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;

describe('useUserActionsPagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
    useInfiniteFindCaseUserActionsMock.mockReturnValue(defaultInfiniteUseFindCaseUserActions);
  });

  it('renders expandable option correctly', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats,
        userActivityQueryParams,
        caseId: basicCase.id,
        isExpandable: true,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );
    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      false
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 3,
          showBottomList: true,
          showLoadMore: true,
          isLoadingUserActions: false,
          isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
          caseUserActions: defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
          hasNextPage: defaultInfiniteUseFindCaseUserActions.hasNextPage,
          fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
        })
      );
    });
  });

  it('renders not expandable option correctly', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats,
        userActivityQueryParams,
        caseId: basicCase.id,
        isExpandable: false,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      false
    );
    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 3,
          showBottomList: true,
          showLoadMore: false,
          isLoadingUserActions: defaultUseFindCaseUserActions.isLoading,
          isLoadingInfiniteUserActions: false,
          caseUserActions: defaultUseFindCaseUserActions.data.userActions,
          hasNextPage: false,
        })
      );
    });
  });

  it('returns loading state correctly', async () => {
    useFindCaseUserActionsMock.mockReturnValue({ isLoading: true });

    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats,
        userActivityQueryParams,
        caseId: basicCase.id,
        isExpandable: false,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      false
    );
    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 3,
          showBottomList: true,
          showLoadMore: false,
          isLoadingUserActions: true,
          isLoadingInfiniteUserActions: false,
          caseUserActions: [],
          hasNextPage: false,
        })
      );
    });
  });

  it('return showLoadMore and hasNextPage as false when it is expandable but has less than 10 user actions', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActionsStats: { total: 9, totalComments: 3, totalOtherActions: 6 },
        userActivityQueryParams,
        caseId: basicCase.id,
        isExpandable: true,
      })
    );

    expect(useInfiniteFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      true
    );
    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      userActivityQueryParams,
      false
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 1,
          showBottomList: true,
          showLoadMore: false,
          isLoadingUserActions: false,
          isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
          caseUserActions: defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
          hasNextPage: false,
          fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
        })
      );
    });
  });
});
