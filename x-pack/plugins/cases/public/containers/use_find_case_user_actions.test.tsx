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
    page: 1,
    perPage: 10,
  };

  const isEnabled = true;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('returns proper state on findCaseUserActions', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useFindCaseUserActions(basicCase.id, params, isEnabled),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        ...initialData,
        data: {
          userActions: [...findCaseUserActionsResponse.userActions],
          total: 30,
          perPage: 10,
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
      () =>
        useFindCaseUserActions(
          basicCase.id,
          {
            type: 'user',
            sortOrder: 'desc',
            page: 1,
            perPage: 5,
          },
          isEnabled
        ),
      { wrapper: appMockRender.AppWrapper }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      basicCase.id,
      { type: 'user', sortOrder: 'desc', page: 1, perPage: 5 },
      expect.any(AbortSignal)
    );
  });

  it('does not call API when not enabled', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(initialData);

    renderHook(
      () =>
        useFindCaseUserActions(
          basicCase.id,
          {
            type: 'user',
            sortOrder: 'desc',
            page: 1,
            perPage: 5,
          },
          false
        ),
      { wrapper: appMockRender.AppWrapper }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook(
      () => useFindCaseUserActions(basicCase.id, params, isEnabled),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      basicCase.id,
      { type: filterActionType, sortOrder, page: 1, perPage: 10 },
      expect.any(AbortSignal)
    );
    expect(addError).toHaveBeenCalled();
  });
});
