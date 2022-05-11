/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useDeleteComment, UseDeleteComment } from './use_delete_comment';
import * as api from './api';
import { basicCaseId } from './mock';

jest.mock('../common/lib/kibana');
jest.mock('./api');

const commentId = 'ab124';
const fetchUserActions = jest.fn();
const updateCase = jest.fn();

describe('useDeleteComment', () => {
  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteComment>(() =>
        useDeleteComment()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isError: false,
        deleteComment: result.current.deleteComment,
      });
    });
  });

  it('calls deleteComment with correct arguments - case', async () => {
    const spyOnDeleteComment = jest.spyOn(api, 'deleteComment');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteComment>(() =>
        useDeleteComment()
      );
      await waitForNextUpdate();

      result.current.deleteComment({
        caseId: basicCaseId,
        commentId,
        fetchUserActions,
        updateCase,
      });
      await waitForNextUpdate();
      expect(spyOnDeleteComment).toBeCalledWith({
        caseId: basicCaseId,
        commentId,
        signal: expect.any(AbortSignal),
      });
      expect(result.current.isError).toBe(false);
    });
  });

  it('fetches the case information', async () => {
    const spyOnGetCase = jest.spyOn(api, 'getCase');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteComment>(() =>
        useDeleteComment()
      );
      await waitForNextUpdate();

      result.current.deleteComment({
        caseId: basicCaseId,
        commentId,
        fetchUserActions,
        updateCase,
      });
      await waitForNextUpdate();
      expect(spyOnGetCase).toBeCalledWith(basicCaseId, true, expect.any(AbortSignal));
    });
  });

  it('sets isError when fails to delete a case', async () => {
    const spyOnDeleteComment = jest.spyOn(api, 'deleteComment');
    spyOnDeleteComment.mockRejectedValue(new Error('Not possible :O'));

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteComment>(() =>
        useDeleteComment()
      );
      await waitForNextUpdate();

      result.current.deleteComment({
        caseId: basicCaseId,
        commentId,
        fetchUserActions,
        updateCase,
      });
      await waitForNextUpdate();
      expect(spyOnDeleteComment).toBeCalledWith({
        caseId: basicCaseId,
        commentId,
        signal: expect.any(AbortSignal),
      });

      expect(result.current.isError).toBe(true);
    });
  });
});
