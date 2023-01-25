/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';

import type { CommentUserAction } from '../../../../common/api';
import { Actions, CommentType } from '../../../../common/api';
import type { UserActionBuilder, UserActionBuilderArgs, UserActionResponse } from '../types';
import { createCommonUpdateUserActionBuilder } from '../common';
import type { Comment } from '../../../containers/types';
import * as i18n from './translations';
import { createUserAttachmentUserActionBuilder } from './user';
import { createAlertAttachmentUserActionBuilder } from './alert';
import { createActionAttachmentUserActionBuilder } from './actions';
import { createExternalReferenceAttachmentUserActionBuilder } from './external_reference';
import { createPersistableStateAttachmentUserActionBuilder } from './persistable_state';

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
const getDeleteLabelTitle = (userAction: UserActionResponse<CommentUserAction>) => {
  const { comment } = userAction.payload;

  if (comment.type === CommentType.alert) {
    const totalAlerts = Array.isArray(comment.alertId) ? comment.alertId.length : 1;
    const alertLabel = i18n.MULTIPLE_ALERTS(totalAlerts);

    return `${i18n.REMOVED_FIELD} ${alertLabel}`;
  }

  if (
    comment.type === CommentType.externalReference ||
    comment.type === CommentType.persistableState
  ) {
    return `${i18n.REMOVED_FIELD} ${i18n.ATTACHMENT.toLowerCase()}`;
  }

  return `${i18n.REMOVED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
};

const getDeleteCommentUserAction = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}: {
  userAction: UserActionResponse<CommentUserAction>;
} & Pick<UserActionBuilderArgs, 'handleOutlineComment' | 'userProfiles'>): EuiCommentProps[] => {
  const label = getDeleteLabelTitle(userAction);
  const commonBuilder = createCommonUpdateUserActionBuilder({
    userAction,
    userProfiles,
    handleOutlineComment,
    label,
    icon: 'cross',
  });

  return commonBuilder.build();
};

const getCreateCommentUserAction = ({
  appId,
  userAction,
  userProfiles,
  caseData,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  comment,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleDeleteComment,
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
  'caseServices' | 'comments' | 'index' | 'handleOutlineComment' | 'currentUserProfile'
>): EuiCommentProps[] => {
  switch (comment.type) {
    case CommentType.user:
      const userBuilder = createUserAttachmentUserActionBuilder({
        appId,
        userProfiles,
        comment,
        outlined: comment.id === selectedOutlineCommentId,
        isEdit: manageMarkdownEditIds.includes(comment.id),
        commentRefs,
        isLoading: loadingCommentIds.includes(comment.id),
        caseId: caseData.id,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        handleDeleteComment,
      });

      return userBuilder.build();

    case CommentType.alert:
      const alertBuilder = createAlertAttachmentUserActionBuilder({
        userProfiles,
        alertData,
        comment,
        userAction,
        getRuleDetailsHref,
        loadingAlertData,
        onRuleDetailsClick,
        onShowAlertDetails,
        handleDeleteComment,
        loadingCommentIds,
      });

      return alertBuilder.build();

    case CommentType.actions:
      const actionBuilder = createActionAttachmentUserActionBuilder({
        userProfiles,
        userAction,
        comment,
        actionsNavigation,
      });

      return actionBuilder.build();

    case CommentType.externalReference:
      const externalReferenceBuilder = createExternalReferenceAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        comment,
        externalReferenceAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(comment.id),
        handleDeleteComment,
      });

      return externalReferenceBuilder.build();

    case CommentType.persistableState:
      const persistableBuilder = createPersistableStateAttachmentUserActionBuilder({
        userAction,
        userProfiles,
        comment,
        persistableStateAttachmentTypeRegistry,
        caseData,
        isLoading: loadingCommentIds.includes(comment.id),
        handleDeleteComment,
      });

      return persistableBuilder.build();
    default:
      return [];
  }
};

export const createCommentUserActionBuilder: UserActionBuilder = ({
  appId,
  caseData,
  userProfiles,
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  userAction,
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
  handleDeleteComment,
  handleManageQuote,
  handleOutlineComment,
  actionsNavigation,
}) => ({
  build: () => {
    const commentUserAction = userAction as UserActionResponse<CommentUserAction>;

    if (commentUserAction.action === Actions.delete) {
      return getDeleteCommentUserAction({
        userAction: commentUserAction,
        handleOutlineComment,
        userProfiles,
      });
    }

    const comment = caseData.comments.find((c) => c.id === commentUserAction.commentId);

    if (comment == null) {
      return [];
    }

    if (commentUserAction.action === Actions.create) {
      const commentAction = getCreateCommentUserAction({
        appId,
        caseData,
        userProfiles,
        userAction: commentUserAction,
        externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
        comment,
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
        handleDeleteComment,
        handleManageQuote,
        actionsNavigation,
      });

      return commentAction;
    }

    const label = getUpdateLabelTitle();
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
