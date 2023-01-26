/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCaseViewParams } from '../../common/navigation';
import type { Case } from '../../containers/types';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import { useUpdateComment } from '../../containers/use_update_comment';
import type { AddCommentRefObject } from '../add_comment';
import type { UserActionMarkdownRefObject } from './markdown_form';
import type { UserActionBuilderArgs } from './types';
import { NEW_COMMENT_ID } from './constants';
import { useDeleteComment } from '../../containers/use_delete_comment';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';

export type UseUserActionsHandler = Pick<
  UserActionBuilderArgs,
  | 'loadingCommentIds'
  | 'selectedOutlineCommentId'
  | 'manageMarkdownEditIds'
  | 'commentRefs'
  | 'handleManageMarkdownEditId'
  | 'handleOutlineComment'
  | 'handleSaveComment'
  | 'handleManageQuote'
  | 'handleDeleteComment'
> & { handleUpdate: (updatedCase: Case) => void };

const isAddCommentRef = (
  ref: AddCommentRefObject | UserActionMarkdownRefObject | null | undefined
): ref is AddCommentRefObject => {
  const commentRef = ref as AddCommentRefObject;
  return commentRef?.addQuote != null;
};

export const useUserActionsHandler = (): UseUserActionsHandler => {
  const { detailName: caseId } = useCaseViewParams();
  const { clearDraftComment, draftComment, hasIncomingLensState, openLensModal } =
    useLensDraftComment();
  const handlerTimeoutId = useRef(0);
  const { isLoadingIds, patchComment } = useUpdateComment();
  const { mutate: deleteComment } = useDeleteComment();
  const [selectedOutlineCommentId, setSelectedOutlineCommentId] = useState('');
  const [manageMarkdownEditIds, setManageMarkdownEditIds] = useState<string[]>([]);
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const commentRefs = useRef<
    Record<string, AddCommentRefObject | UserActionMarkdownRefObject | undefined | null>
  >({});

  const handleManageMarkdownEditId = useCallback(
    (id: string) => {
      clearDraftComment();
      setManageMarkdownEditIds((prevManageMarkdownEditIds) =>
        !prevManageMarkdownEditIds.includes(id)
          ? prevManageMarkdownEditIds.concat(id)
          : prevManageMarkdownEditIds.filter((myId) => id !== myId)
      );
    },
    [clearDraftComment]
  );

  const handleSaveComment = useCallback(
    ({ id, version }: { id: string; version: string }, content: string) => {
      patchComment({
        caseId,
        commentId: id,
        commentUpdate: content,
        version,
      });
    },
    [caseId, patchComment]
  );

  const handleDeleteComment = useCallback(
    (id: string) => {
      deleteComment({ caseId, commentId: id });
    },
    [caseId, deleteComment]
  );

  const handleOutlineComment = useCallback(
    (id: string) => {
      const moveToTarget = document.getElementById(`${id}-permLink`);
      if (moveToTarget != null) {
        const yOffset = -120;
        const y = moveToTarget.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({
          top: y,
          behavior: 'smooth',
        });

        if (id === 'add-comment') {
          moveToTarget.getElementsByTagName('textarea')[0].focus();
        }
      }

      window.clearTimeout(handlerTimeoutId.current);
      setSelectedOutlineCommentId(id);

      handlerTimeoutId.current = window.setTimeout(() => {
        setSelectedOutlineCommentId('');
        window.clearTimeout(handlerTimeoutId.current);
      }, 2400);
    },
    [handlerTimeoutId]
  );

  const handleManageQuote = useCallback(
    (quote: string) => {
      const ref = commentRefs?.current[NEW_COMMENT_ID];
      if (isAddCommentRef(ref)) {
        ref.addQuote(quote);
      }

      handleOutlineComment('add-comment');
    },
    [handleOutlineComment]
  );

  useEffect(() => {
    if (draftComment?.commentId) {
      setManageMarkdownEditIds((prevManageMarkdownEditIds) => {
        if (
          NEW_COMMENT_ID !== draftComment?.commentId &&
          !prevManageMarkdownEditIds.includes(draftComment?.commentId)
        ) {
          return [draftComment?.commentId];
        }
        return prevManageMarkdownEditIds;
      });

      const ref = commentRefs?.current?.[draftComment.commentId];

      if (isAddCommentRef(ref) && ref.editor?.textarea) {
        ref.setComment(draftComment.comment);
        if (hasIncomingLensState) {
          openLensModal({ editorRef: ref.editor });
        } else {
          clearDraftComment();
        }
      }
    }
  }, [clearDraftComment, draftComment, hasIncomingLensState, openLensModal]);

  return {
    loadingCommentIds: isLoadingIds,
    selectedOutlineCommentId,
    manageMarkdownEditIds,
    commentRefs,
    handleManageMarkdownEditId,
    handleOutlineComment,
    handleSaveComment,
    handleDeleteComment,
    handleManageQuote,
    handleUpdate: refreshCaseViewPage,
  };
};
