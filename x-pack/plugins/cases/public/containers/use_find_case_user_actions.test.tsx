/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFindCaseUserActions } from './use_find_case_user_actions';
import type { CaseUserActionTypeWithAll } from '../../common/ui/types';
import { basicCase, findCaseUserActionsResponse } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

describe('UseFindCaseUserActions', () => {
  const filterActionType: CaseUserActionTypeWithAll = 'all';
  const sortOrder: 'asc' | 'desc' = 'asc';
  const params = {
    type: filterActionType,
    sortOrder,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns proper state on findCaseUserActions', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useFindCaseUserActions(basicCase.id, params),
      { wrapper: appMockRender.AppWrapper }
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

  it('calls the API with correct parameters', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(initialData);

    const { waitForNextUpdate } = renderHook(
      () => useFindCaseUserActions(basicCase.id, { type: 'user', sortOrder: 'desc' }),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      basicCase.id,
      { type: 'user', sortOrder: 'desc' },
      expect.any(AbortSignal)
    );
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook(() => useFindCaseUserActions(basicCase.id, params), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      basicCase.id,
      { type: filterActionType, sortOrder },
      expect.any(AbortSignal)
    );
    expect(addError).toHaveBeenCalled();
  });
});
