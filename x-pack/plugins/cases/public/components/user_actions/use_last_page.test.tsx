/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useLastPage } from './use_last_page';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const userActionsStats = {
  total: 5,
  totalComments: 2,
  totalOtherActions: 3,
};

jest.mock('../../common/lib/kibana');

describe('useLastPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correctly', async () => {
    const { result, waitFor } = renderHook(() =>
      useLastPage({
        userActionsStats,
        userActivityQueryParams,
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 1,
        })
      );
    });
  });

  it('returns 0 when actions stats are 0', async () => {
    const { result, waitFor } = renderHook(() =>
      useLastPage({
        userActionsStats: { total: 0, totalComments: 0, totalOtherActions: 0 },
        userActivityQueryParams,
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 0,
        })
      );
    });
  });

  it('returns correct last page when filter type is all', async () => {
    const { result, waitFor } = renderHook(() =>
      useLastPage({
        userActionsStats: { total: 38, totalComments: 17, totalOtherActions: 21 },
        userActivityQueryParams,
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 4,
        })
      );
    });
  });

  it('returns correct last page when filter type is user', async () => {
    const { result, waitFor } = renderHook(() =>
      useLastPage({
        userActionsStats: { total: 38, totalComments: 17, totalOtherActions: 21 },
        userActivityQueryParams: {
          ...userActivityQueryParams,
          type: 'user',
        },
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 2,
        })
      );
    });
  });

  it('returns correct last page when filter type is action', async () => {
    const { result, waitFor } = renderHook(() =>
      useLastPage({
        userActionsStats: { total: 38, totalComments: 17, totalOtherActions: 21 },
        userActivityQueryParams: {
          ...userActivityQueryParams,
          type: 'action',
        },
      })
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          lastPage: 3,
        })
      );
    });
  });
});
