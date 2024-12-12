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
import type { AddObservableRequest } from '../../common/types/api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const observableMock: AddObservableRequest = {
  observable: {
    typeKey: '80a3cc9b-500a-45fa-909a-b4f78751726c',
    value: 'test_value',
    description: '',
  },
};

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
      result.current.mutate(observableMock);
    });

    await waitForNextUpdate();

    expect(spy).toHaveBeenCalledWith({ observable: observableMock.observable }, mockCase.id);
  });

  it('invalidates the queries correctly', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');
    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
  });

  it('does shows a success toaster', async () => {
    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitForNextUpdate();

    expect(addSuccess).toHaveBeenCalled();
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'postObservable')
      .mockRejectedValue(new Error('usePostObservables: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
