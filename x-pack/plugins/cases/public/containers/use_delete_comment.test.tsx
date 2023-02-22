/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import type { UseDeleteComment } from './use_delete_comment';
import { useDeleteComment } from './use_delete_comment';
import * as api from './api';
import { basicCaseId } from './mock';
import { TestProviders } from '../common/mock';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useToasts } from '../common/lib/kibana';

jest.mock('../common/lib/kibana');
jest.mock('./api');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

const commentId = 'ab124';

const wrapper: React.FC<string> = ({ children }) => <TestProviders>{children}</TestProviders>;

describe('useDeleteComment', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<string, UseDeleteComment>(() => useDeleteComment(), {
      wrapper,
    });

    expect(result.current).toBeTruthy();
  });

  it('calls deleteComment with correct arguments - case', async () => {
    const spyOnDeleteComment = jest.spyOn(api, 'deleteComment');

    const { waitForNextUpdate, result } = renderHook<string, UseDeleteComment>(
      () => useDeleteComment(),
      {
        wrapper,
      }
    );

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
      });
    });

    await waitForNextUpdate();

    expect(spyOnDeleteComment).toBeCalledWith({
      caseId: basicCaseId,
      commentId,
      signal: expect.any(AbortSignal),
    });
  });

  it('refreshes the case page view after delete', async () => {
    const { waitForNextUpdate, result } = renderHook<string, UseDeleteComment>(
      () => useDeleteComment(),
      {
        wrapper,
      }
    );

    result.current.mutate({
      caseId: basicCaseId,
      commentId,
    });

    await waitForNextUpdate();

    expect(useRefreshCaseViewPage()).toBeCalled();
  });

  it('sets isError when fails to delete a case', async () => {
    const spyOnDeleteComment = jest.spyOn(api, 'deleteComment');
    spyOnDeleteComment.mockRejectedValue(new Error('Not possible :O'));

    const { waitForNextUpdate, result } = renderHook<string, UseDeleteComment>(
      () => useDeleteComment(),
      {
        wrapper,
      }
    );

    result.current.mutate({
      caseId: basicCaseId,
      commentId,
    });

    await waitForNextUpdate();

    expect(spyOnDeleteComment).toBeCalledWith({
      caseId: basicCaseId,
      commentId,
      signal: expect.any(AbortSignal),
    });

    expect(addError).toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
  });
});
