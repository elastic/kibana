/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { CommentType } from '../../../../case/common/api';
import { usePostComment, UsePostComment } from './use_post_comment';
import { basicCaseId, basicSubCaseId } from './mock';
import * as api from './api';

jest.mock('./api');

describe('usePostComment', () => {
  const abortCtrl = new AbortController();
  const samplePost = {
    comment: 'a comment',
    type: CommentType.user as const,
  };
  const updateCaseCallback = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        postComment: result.current.postComment,
      });
    });
  });

  it('calls postComment with correct arguments - case', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postComment');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();

      result.current.postComment({
        caseId: basicCaseId,
        data: samplePost,
        updateCase: updateCaseCallback,
      });
      await waitForNextUpdate();
      expect(spyOnPostCase).toBeCalledWith(samplePost, basicCaseId, abortCtrl.signal, undefined);
    });
  });

  it('calls postComment with correct arguments - sub case', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postComment');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();

      result.current.postComment({
        caseId: basicCaseId,
        data: samplePost,
        updateCase: updateCaseCallback,
        subCaseId: basicSubCaseId,
      });
      await waitForNextUpdate();
      expect(spyOnPostCase).toBeCalledWith(
        samplePost,
        basicCaseId,
        abortCtrl.signal,
        basicSubCaseId
      );
    });
  });

  it('post case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();
      result.current.postComment({
        caseId: basicCaseId,
        data: samplePost,
        updateCase: updateCaseCallback,
      });
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        postComment: result.current.postComment,
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();
      result.current.postComment({
        caseId: basicCaseId,
        data: samplePost,
        updateCase: updateCaseCallback,
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postComment');
    spyOnPostCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();
      result.current.postComment({
        caseId: basicCaseId,
        data: samplePost,
        updateCase: updateCaseCallback,
      });

      expect(result.current).toEqual({
        isLoading: false,
        isError: true,
        postComment: result.current.postComment,
      });
    });
  });
});
