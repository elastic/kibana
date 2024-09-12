/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeleteComment } from './use_delete_comment';
import * as api from './api';
import { basicCaseId } from './mock';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';

jest.mock('../common/lib/kibana');
jest.mock('./api');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

const commentId = 'ab124';
const successToasterTitle = 'Deleted';

describe('useDeleteComment', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toBeTruthy();
  });

  it('calls deleteComment with correct arguments - case', async () => {
    const spyOnDeleteComment = jest.spyOn(api, 'deleteComment');

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
        successToasterTitle,
      });
    });

    await waitFor(() => null);

    expect(spyOnDeleteComment).toBeCalledWith({
      caseId: basicCaseId,
      commentId,
    });
  });

  it('refreshes the case page view after delete', async () => {
    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    result.current.mutate({
      caseId: basicCaseId,
      commentId,
      successToasterTitle,
    });

    await waitFor(() => null);

    expect(useRefreshCaseViewPage()).toBeCalled();
  });

  it('shows a success toaster correctly', async () => {
    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        commentId,
        successToasterTitle,
      });
    });

    await waitFor(() => null);

    expect(addSuccess).toHaveBeenCalledWith({
      title: 'Deleted',
      className: 'eui-textBreakWord',
    });
  });

  it('sets isError when fails to delete a case', async () => {
    const spyOnDeleteComment = jest.spyOn(api, 'deleteComment');
    spyOnDeleteComment.mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDeleteComment(), {
      wrapper: appMockRender.AppWrapper,
    });

    result.current.mutate({
      caseId: basicCaseId,
      commentId,
      successToasterTitle,
    });

    await waitFor(() => null);

    expect(spyOnDeleteComment).toBeCalledWith({
      caseId: basicCaseId,
      commentId,
    });

    expect(addError).toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
  });
});
