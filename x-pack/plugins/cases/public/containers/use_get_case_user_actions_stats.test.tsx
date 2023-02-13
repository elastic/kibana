/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';

import { useToasts } from '../common/lib/kibana';
import { testQueryClient } from '../common/mock';
import type { UseGetCaseUserActionsStats } from './use_get_case_user_actions_stats';
import { useGetCaseUserActionsStats } from './use_get_case_user_actions_stats';
import { basicCase } from './mock';
import * as api from './api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

const wrapper: React.FC<string> = ({ children }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('UseGetCaseUserActionsStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns proper state on getCaseUserActionsStats', async () => {
    const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActionsStats>(
      () => useGetCaseUserActionsStats(basicCase.id),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        ...initialData,
        data: {
          total: 20,
          totalComments: 10,
          totalOtherActions: 10,
        },
        isError: false,
        isLoading: false,
        isFetching: false,
      })
    );
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest
      .spyOn(api, 'getCaseUserActionsStats')
      .mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook<string, UseGetCaseUserActionsStats>(
      () => useGetCaseUserActionsStats(basicCase.id),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
    expect(addError).toHaveBeenCalled();
  });
});
