/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

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
        userActivityQueryParams,
        caseId: basicCase.id,
        lastPage: 3,
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
          showBottomList: true,
          isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
          infiniteCaseUserActions: defaultInfiniteUseFindCaseUserActions.data.pages[0].userActions,
          hasNextPage: defaultInfiniteUseFindCaseUserActions.hasNextPage,
          fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
        })
      );
    });
  });

  it('renders less than 10 user actions correctly', async () => {
    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActivityQueryParams,
        caseId: basicCase.id,
        lastPage: 1,
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
        userActivityQueryParams,
        caseId: basicCase.id,
        lastPage: 3,
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
          showBottomList: true,
          isLoadingInfiniteUserActions: true,
          infiniteCaseUserActions: [],
          hasNextPage: undefined,
          fetchNextPage: undefined,
        })
      );
    });
  });

  it('returns empty array when data is undefined', async () => {
    useInfiniteFindCaseUserActionsMock.mockReturnValue({ isLoading: false, data: undefined });

    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActivityQueryParams,
        caseId: basicCase.id,
        lastPage: 3,
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
          showBottomList: true,
          isLoadingInfiniteUserActions: false,
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
        pages: { total: 25, perPage: 10, page: 1, userActions: [] },
      },
    });

    const { result, waitFor } = renderHook(() =>
      useUserActionsPagination({
        userActivityQueryParams,
        caseId: basicCase.id,
        lastPage: 1,
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
          showBottomList: false,
          isLoadingInfiniteUserActions: defaultInfiniteUseFindCaseUserActions.isLoading,
          infiniteCaseUserActions: [],
          hasNextPage: false,
          fetchNextPage: defaultInfiniteUseFindCaseUserActions.fetchNextPage,
        })
      );
    });
  });
});
