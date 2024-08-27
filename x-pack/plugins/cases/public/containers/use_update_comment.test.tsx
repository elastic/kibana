/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { basicCase } from './mock';
import * as api from './api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';
import { useUpdateComment } from './use_update_comment';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useUpdateComment', () => {
  const sampleUpdate = {
    caseId: basicCase.id,
    commentId: basicCase.comments[0].id,
    commentUpdate: 'updated comment',
    version: basicCase.comments[0].version,
  };

  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('patch case and refresh the case page', async () => {
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');

    const { waitForNextUpdate, result } = renderHook(() => useUpdateComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitForNextUpdate();

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCommentSpy = jest.spyOn(api, 'patchComment');
    const { waitForNextUpdate, result } = renderHook(() => useUpdateComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitForNextUpdate();

    expect(patchCommentSpy).toHaveBeenCalledWith({
      ...sampleUpdate,
      owner: 'securitySolution',
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'patchComment').mockRejectedValue(new Error('useUpdateComment: Test error'));

    const { waitForNextUpdate, result } = renderHook(() => useUpdateComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitForNextUpdate();

    expect(addError).toHaveBeenCalled();
  });
});
