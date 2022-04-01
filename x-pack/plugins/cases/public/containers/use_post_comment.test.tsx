/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { CommentType } from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { usePostComment, UsePostComment } from './use_post_comment';
import { basicCaseId } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const useToastMock = useToasts as jest.Mock;

describe('usePostComment', () => {
  const toastErrorMock = jest.fn();
  useToastMock.mockReturnValue({
    addError: toastErrorMock,
  });

  const abortCtrl = new AbortController();
  const samplePost = {
    comment: 'a comment',
    type: CommentType.user as const,
    owner: SECURITY_SOLUTION_OWNER,
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
      expect(spyOnPostCase).toBeCalledWith(samplePost, basicCaseId, abortCtrl.signal);
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

  it('set isError true and shows a toast error when an error occurs', async () => {
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

      expect(toastErrorMock).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Error fetching data',
      });
    });
  });

  it('throws an error when invoked with throwOnError true', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postComment');
    spyOnPostCase.mockImplementation(() => {
      throw new Error('This is not possible');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostComment>(() =>
        usePostComment()
      );
      await waitForNextUpdate();
      async function test() {
        await result.current.postComment({
          caseId: basicCaseId,
          data: samplePost,
          updateCase: updateCaseCallback,
          throwOnError: true,
        });
      }
      expect(test()).rejects.toThrowError('This is not possible');
    });
  });
});
