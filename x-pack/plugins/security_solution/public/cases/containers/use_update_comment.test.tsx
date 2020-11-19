/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUpdateComment, UseUpdateComment } from './use_update_comment';
import { basicCase, basicCaseCommentPatch } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useUpdateComment', () => {
  const abortCtrl = new AbortController();
  const fetchUserActions = jest.fn();
  const updateCase = jest.fn();
  const sampleUpdate = {
    caseId: basicCase.id,
    commentId: basicCase.comments[0].id,
    commentUpdate: 'updated comment',
    fetchUserActions,
    updateCase,
    version: basicCase.comments[0].version,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateComment>(() =>
        useUpdateComment()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoadingIds: [],
        isError: false,
        patchComment: result.current.patchComment,
      });
    });
  });

  it('calls patchComment with correct arguments', async () => {
    const spyOnPatchComment = jest.spyOn(api, 'patchComment');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateComment>(() =>
        useUpdateComment()
      );
      await waitForNextUpdate();

      result.current.patchComment(sampleUpdate);
      await waitForNextUpdate();
      expect(spyOnPatchComment).toBeCalledWith(
        basicCase.id,
        basicCase.comments[0].id,
        'updated comment',
        basicCase.comments[0].version,
        abortCtrl.signal
      );
    });
  });

  it('patch comment', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateComment>(() =>
        useUpdateComment()
      );
      await waitForNextUpdate();
      result.current.patchComment(sampleUpdate);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoadingIds: [],
        isError: false,
        patchComment: result.current.patchComment,
      });
      expect(fetchUserActions).toBeCalled();
      expect(updateCase).toBeCalledWith(basicCaseCommentPatch);
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateComment>(() =>
        useUpdateComment()
      );
      await waitForNextUpdate();
      result.current.patchComment(sampleUpdate);

      expect(result.current.isLoadingIds).toEqual([basicCase.comments[0].id]);
    });
  });

  it('unhappy path', async () => {
    const spyOnPatchComment = jest.spyOn(api, 'patchComment');
    spyOnPatchComment.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateComment>(() =>
        useUpdateComment()
      );
      await waitForNextUpdate();
      result.current.patchComment(sampleUpdate);

      expect(result.current).toEqual({
        isLoadingIds: [],
        isError: true,
        patchComment: result.current.patchComment,
      });
    });
  });
});
