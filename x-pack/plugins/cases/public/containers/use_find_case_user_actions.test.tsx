/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { UseFindCaseUserActions } from './use_find_case_user_actions';
import { useFindCaseUserActions } from './use_find_case_user_actions';
import { basicCase, findCaseUserActionsResponse } from './mock';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { testQueryClient } from '../common/mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';

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

describe('UseFindCaseUserActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns proper state on findCaseUserActions', async () => {
    const { result, waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
      () => useFindCaseUserActions(basicCase.id),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        ...initialData,
        data: {
          userActions: [...findCaseUserActionsResponse.userActions],
          total: 20,
          perPage: 1000,
          page: 1,
        },
        isError: false,
        isLoading: false,
        isFetching: false,
      })
    );
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook<string, UseFindCaseUserActions>(
      () => useFindCaseUserActions(basicCase.id),
      { wrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
    expect(addError).toHaveBeenCalled();
  });
});
