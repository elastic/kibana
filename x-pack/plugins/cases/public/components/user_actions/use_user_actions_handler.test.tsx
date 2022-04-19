/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { basicCase } from '../../containers/mock';

import { useUpdateComment } from '../../containers/use_update_comment';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import { NEW_COMMENT_ID } from './constants';
import {
  useUserActionsHandler,
  UseUserActionsHandlerArgs,
  UseUserActionsHandler,
} from './use_user_actions_handler';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../../containers/use_update_comment');

const useUpdateCommentMock = useUpdateComment as jest.Mock;
const useLensDraftCommentMock = useLensDraftComment as jest.Mock;
const patchComment = jest.fn();
const clearDraftComment = jest.fn();
const openLensModal = jest.fn();

describe('useUserActionsHandler', () => {
  const fetchUserActions = jest.fn();
  const updateCase = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
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

  it('should saves a comment', async () => {
    const { result } = renderHook<UseUserActionsHandlerArgs, UseUserActionsHandler>(() =>
      useUserActionsHandler({ fetchUserActions, updateCase })
    );

    result.current.handleSaveComment({ id: 'test-id', version: 'test-version' }, 'a comment');
    expect(patchComment).toHaveBeenCalledWith({
      caseId: 'basic-case-id',
      commentId: 'test-id',
      commentUpdate: 'a comment',
      fetchUserActions,
      updateCase,
      version: 'test-version',
    });
  });

  it('should update a case', async () => {
    const { result } = renderHook<UseUserActionsHandlerArgs, UseUserActionsHandler>(() =>
      useUserActionsHandler({ fetchUserActions, updateCase })
    );

    result.current.handleUpdate(basicCase);
    expect(fetchUserActions).toHaveBeenCalled();
    expect(updateCase).toHaveBeenCalledWith(basicCase);
  });

  it('should handle markdown edit', async () => {
    const { result } = renderHook<UseUserActionsHandlerArgs, UseUserActionsHandler>(() =>
      useUserActionsHandler({ fetchUserActions, updateCase })
    );

    act(() => {
      result.current.handleManageMarkdownEditId('test-id');
    });

    expect(clearDraftComment).toHaveBeenCalled();
    expect(result.current.manageMarkdownEditIds).toEqual(['test-id']);
  });

  it('should remove id from the markdown edit ids', async () => {
    const { result } = renderHook<UseUserActionsHandlerArgs, UseUserActionsHandler>(() =>
      useUserActionsHandler({ fetchUserActions, updateCase })
    );

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
    const { result } = renderHook<UseUserActionsHandlerArgs, UseUserActionsHandler>(() =>
      useUserActionsHandler({ fetchUserActions, updateCase })
    );

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
    const { result } = renderHook<UseUserActionsHandlerArgs, UseUserActionsHandler>(() =>
      useUserActionsHandler({ fetchUserActions, updateCase })
    );

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
