/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { usePostObservable } from './use_post_observables';
import { casesQueriesKeys } from './constants';
import { mockCase } from './mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('usePostObservables', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'postObservable');
    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ observable: {} });
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith(
      { observables: [], caseId: mockCase.id, version: mockCase.version },
      mockCase.id
    );
  });

  it('invalidates the queries correctly', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');
    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ observable: {} });
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('does not show a success toaster', async () => {
    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ observable: {} });
    });

    await waitForNextUpdate();

    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'postObservables')
      .mockRejectedValue(new Error('usePostObservables: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({ observable: {} });
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
