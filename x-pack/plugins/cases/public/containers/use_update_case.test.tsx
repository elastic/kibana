/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdateCase } from './use_update_case';
import { basicCase } from './mock';
import * as api from './api';
import type { UpdateKey } from './types';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { casesQueriesKeys } from './constants';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useUpdateCase', () => {
  const updateKey: UpdateKey = 'description';

  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  const sampleUpdate = {
    updateKey,
    updateValue: 'updated description',
    caseData: basicCase,
  };

  it('patch case and refresh the case page', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => null);

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCaseSpy = jest.spyOn(api, 'patchCase');
    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => null);

    expect(patchCaseSpy).toHaveBeenCalledWith({
      caseId: basicCase.id,
      updatedCase: { description: 'updated description' },
      version: basicCase.version,
    });
  });

  it('shows a success toaster', async () => {
    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => null);

    expect(addSuccess).toHaveBeenCalledWith({
      title: 'Updated "Another horrible breach!!"',
      className: 'eui-textBreakWord',
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'patchCase').mockRejectedValue(new Error('useUpdateCase: Test error'));

    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => null);

    expect(addError).toHaveBeenCalled();
  });
});
