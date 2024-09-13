/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';

import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
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

describe('useGetCaseUserActionsStats', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('returns proper state on getCaseUserActionsStats', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useGetCaseUserActionsStats(basicCase.id),
      { wrapper: appMockRender.AppWrapper }
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

    const { waitForNextUpdate } = renderHook(() => useGetCaseUserActionsStats(basicCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
    expect(addError).toHaveBeenCalled();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getCaseUserActionsStats');

    const { waitForNextUpdate } = renderHook(() => useGetCaseUserActionsStats(basicCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
  });
});
