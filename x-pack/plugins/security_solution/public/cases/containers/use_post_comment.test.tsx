/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePostComment, UsePostComment } from './use_post_comment';
import { basicCaseId } from './mock';
import * as api from './api';

jest.mock('./api');

describe('usePostComment', () => {
  const abortCtrl = new AbortController();
  const samplePost = {
    comment: 'a comment',
  };
  const updateCaseCallback = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment(basicCaseId)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        postComment: result.current.postComment,
      });
    });
  });

  it('calls postComment with correct arguments', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postComment');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment(basicCaseId)
      );
      await waitForNextUpdate();

      result.current.postComment(samplePost, updateCaseCallback);
      await waitForNextUpdate();
      expect(spyOnPostCase).toBeCalledWith(samplePost, basicCaseId, abortCtrl.signal);
    });
  });

  it('post case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment(basicCaseId)
      );
      await waitForNextUpdate();
      result.current.postComment(samplePost, updateCaseCallback);
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
        usePostComment(basicCaseId)
      );
      await waitForNextUpdate();
      result.current.postComment(samplePost, updateCaseCallback);

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
        usePostComment(basicCaseId)
      );
      await waitForNextUpdate();
      result.current.postComment(samplePost, updateCaseCallback);

      expect(result.current).toEqual({
        isLoading: false,
        isError: true,
        postComment: result.current.postComment,
      });
    });
  });
});
