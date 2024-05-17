/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import * as api from './api';
import { casesQueriesKeys } from './constants';
import { allCases } from './mock';
import { useUpdateCases } from './use_bulk_update_case';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useUpdateCases', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'updateCases');
    const { waitForNextUpdate, result } = renderHook(() => useUpdateCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ cases: allCases.cases, successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({ cases: allCases.cases });
  });

  it('invalidates the queries correctly', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');
    const { waitForNextUpdate, result } = renderHook(() => useUpdateCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ cases: allCases.cases, successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('shows a success toaster', async () => {
    const { waitForNextUpdate, result } = renderHook(() => useUpdateCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ cases: allCases.cases, successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(addSuccess).toHaveBeenCalledWith({
      title: 'Success title',
      className: 'eui-textBreakWord',
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'updateCases').mockRejectedValue(new Error('useUpdateCases: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => useUpdateCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ cases: allCases.cases, successToasterTitle: 'Success title' });
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
