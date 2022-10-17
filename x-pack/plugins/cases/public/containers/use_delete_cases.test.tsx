/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useDeleteCases } from './use_delete_cases';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { casesQueriesKeys } from './constants';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useDeleteCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'deleteCases');
    const { waitForNextUpdate, result } = renderHook(() => useDeleteCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(['1', '2'], abortCtrl.signal);
  });

  it('invalidates the queries correctly', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');
    const { waitForNextUpdate, result } = renderHook(() => useDeleteCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('shows a success toaster', async () => {
    const { waitForNextUpdate, result } = renderHook(() => useDeleteCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(addSuccess).toHaveBeenCalledWith('Success title');
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'deleteCases').mockRejectedValue(new Error('useDeleteCases: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => useDeleteCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
