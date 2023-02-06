/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { basicCase } from '../../containers/mock';

import { useUpdateComment } from '../../containers/use_update_comment';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { TestProviders } from '../../common/mock';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import { NEW_COMMENT_ID } from './constants';
import { useUserActionsHandler } from './use_user_actions_handler';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../case_view/use_on_refresh_case_view_page');
jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../../containers/use_update_comment');

const useUpdateCommentMock = useUpdateComment as jest.Mock;
const useLensDraftCommentMock = useLensDraftComment as jest.Mock;
const patchComment = jest.fn();
const clearDraftComment = jest.fn();
const openLensModal = jest.fn();

const wrapper: React.FC<string> = ({ children }) => <TestProviders>{children}</TestProviders>;

describe('useUserActionsHandler', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    jest.spyOn(global, 'setTimeout');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCommentMock.mockReturnValue({
      isLoadingIds: [],
      patchComment,
    });

    useLensDraftCommentMock.mockReturnValue({
      clearDraftComment,
      openLensModal,
      draftComment: null,
      hasIncomingLensState: false,
    });
  });

  it('should save a comment', async () => {
    const { result } = renderHook(() => useUserActionsHandler(), {
      wrapper,
    });

    result.current.handleSaveComment({ id: 'test-id', version: 'test-version' }, 'a comment');
    expect(patchComment).toHaveBeenCalledWith({
      caseId: 'basic-case-id',
      commentId: 'test-id',
      commentUpdate: 'a comment',
      version: 'test-version',
    });
  });

  it('should refresh the case case after updating', async () => {
    const { result } = renderHook(() => useUserActionsHandler(), {
      wrapper,
    });

    result.current.handleUpdate(basicCase);
    expect(useRefreshCaseViewPage()).toHaveBeenCalled();
  });

  it('should handle markdown edit', async () => {
    const { result } = renderHook(() => useUserActionsHandler(), {
      wrapper,
    });

    act(() => {
      result.current.handleManageMarkdownEditId('test-id');
    });

    expect(clearDraftComment).toHaveBeenCalled();
    expect(result.current.manageMarkdownEditIds).toEqual(['test-id']);
  });

  it('should remove id from the markdown edit ids', async () => {
    const { result } = renderHook(() => useUserActionsHandler(), {
      wrapper,
    });

    act(() => {
      result.current.handleManageMarkdownEditId('test-id');
    });

    expect(result.current.manageMarkdownEditIds).toEqual(['test-id']);

    act(() => {
      result.current.handleManageMarkdownEditId('test-id');
    });

    expect(result.current.manageMarkdownEditIds).toEqual([]);
  });

  it('should outline a comment', async () => {
    const { result } = renderHook(() => useUserActionsHandler(), {
      wrapper,
    });

    act(() => {
      result.current.handleOutlineComment('test-id');
    });

    expect(result.current.selectedOutlineCommentId).toBe('test-id');

    act(() => {
      jest.runAllTimers();
    });

    expect(result.current.selectedOutlineCommentId).toBe('');
  });

  it('should quote', async () => {
    const addQuote = jest.fn();
    const { result } = renderHook(() => useUserActionsHandler(), {
      wrapper,
    });

    result.current.commentRefs.current[NEW_COMMENT_ID] = {
      addQuote,
      setComment: jest.fn(),
    };

    act(() => {
      result.current.handleManageQuote('my quote');
    });

    expect(addQuote).toHaveBeenCalledWith('my quote');
    expect(result.current.selectedOutlineCommentId).toBe('add-comment');
  });
});
