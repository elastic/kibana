/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentProps } from '@elastic/eui';

import { CommentUserAction, Actions, CommentType } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs, UserActionResponse } from '../types';
import { createCommonUpdateUserActionBuilder } from '../common';
import { Comment } from '../../../containers/types';
import * as i18n from '../translations';
import { createUserAttachmentUserActionBuilder } from './user';
import { createAlertAttachmentUserActionBuilder } from './alert';
import { createActionAttachmentUserActionBuilder } from './actions';

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
const getDeleteLabelTitle = () => `${i18n.REMOVED_FIELD} ${i18n.COMMENT.toLowerCase()}`;

const getDeleteCommentUserAction = ({
  userAction,
  handleOutlineComment,
}: {
  userAction: UserActionResponse<CommentUserAction>;
} & Pick<UserActionBuilderArgs, 'handleOutlineComment'>): EuiCommentProps[] => {
  const label = getDeleteLabelTitle();
  const commonBuilder = createCommonUpdateUserActionBuilder({
    userAction,
    handleOutlineComment,
    label,
    icon: 'cross',
  });

  return commonBuilder.build();
};

const getCreateCommentUserAction = ({
  userAction,
  comment,
  userCanCrud,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  alertData,
  onShowAlertDetails,
  actionsNavigation,
}: {
  userAction: UserActionResponse<CommentUserAction>;
  comment: Comment;
} & Omit<
  UserActionBuilderArgs,
  'caseData' | 'caseServices' | 'comments' | 'index' | 'handleOutlineComment'
>): EuiCommentProps[] => {
  switch (comment.type) {
    case CommentType.user:
      const userBuilder = createUserAttachmentUserActionBuilder({
        comment,
        userCanCrud,
        outlined: comment.id === selectedOutlineCommentId,
        isEdit: manageMarkdownEditIds.includes(comment.id),
        commentRefs,
        isLoading: loadingCommentIds.includes(comment.id),
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
      });

      return userBuilder.build();

    case CommentType.alert:
      const alertBuilder = createAlertAttachmentUserActionBuilder({
        alertData,
        comment,
        userAction,
        getRuleDetailsHref,
        loadingAlertData,
        onRuleDetailsClick,
        onShowAlertDetails,
      });
      return alertBuilder.build();
    case CommentType.actions:
      const actionBuilder = createActionAttachmentUserActionBuilder({
        userAction,
        comment,
        actionsNavigation,
      });
      return actionBuilder.build();
    default:
      return [];
  }
};

export const createCommentUserActionBuilder: UserActionBuilder = ({
  caseData,
  userAction,
  userCanCrud,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  loadingAlertData,
  alertData,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleOutlineComment,
  actionsNavigation,
}) => ({
  build: () => {
    const commentUserAction = userAction as UserActionResponse<CommentUserAction>;

    if (commentUserAction.action === Actions.delete) {
      return getDeleteCommentUserAction({ userAction: commentUserAction, handleOutlineComment });
    }

    const comment = caseData.comments.find((c) => c.id === commentUserAction.commentId);
    if (comment == null) {
      return [];
    }

    if (commentUserAction.action === Actions.create) {
      const commentAction = getCreateCommentUserAction({
        userAction: commentUserAction,
        comment,
        userCanCrud,
        commentRefs,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        loadingAlertData,
        alertData,
        getRuleDetailsHref,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        actionsNavigation,
      });

      return commentAction;
    }

    const label = getUpdateLabelTitle();
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
