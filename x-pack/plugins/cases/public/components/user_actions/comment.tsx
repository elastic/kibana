/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { get } from 'lodash';
import { ThemeContext } from 'styled-components';
import classNames from 'classnames';
import { EuiCommentProps, EuiFlexGroup, EuiFlexItem, EuiToken } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import {
  CommentUserAction,
  Actions,
  CommentType,
  CommentResponseUserType,
  CommentResponseAlertsType,
  CommentResponseActionsType,
} from '../../../common/api';
import {
  ActionsNavigation,
  RuleDetailsNavigation,
  UserActionBuilder,
  UserActionBuilderArgs,
  UserActionResponse,
} from './types';
import { createCommonUserActionBuilder } from './common';
import { Comment, Ecs } from '../../containers/types';
import { UserActionAvatar } from './user_action_avatar';
import { UserActionContentToolbar } from './user_action_content_toolbar';
import {
  ContentWrapper,
  UserActionMarkdown,
  UserActionMarkdownRefObject,
} from './user_action_markdown';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionUsername } from './user_action_username';
import { AddCommentRefObject } from '../add_comment';
import { SnakeToCamelCase } from '../../../common/types';
import { UserActionUsernameWithAvatar } from './user_action_username_with_avatar';
import { AlertCommentEvent } from './user_action_alert_comment_event';
import { UserActionCopyLink } from './user_action_copy_link';
import { UserActionShowAlert } from './user_action_show_alert';
import * as i18n from './translations';
import { MarkdownRenderer } from '../markdown_editor';
import { HostIsolationCommentEvent } from './user_action_host_isolation_comment_event';

const getUserAttachmentUserAction = ({
  comment,
  userCanCrud,
  outlined,
  isEdit,
  isLoading,
  commentRefs,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
}: {
  comment: SnakeToCamelCase<CommentResponseUserType>;
  userCanCrud: boolean;
  outlined: boolean;
  isEdit: boolean;
  isLoading: boolean;
  commentRefs: React.MutableRefObject<
    Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>
  >;
  handleManageMarkdownEditId: (id: string) => void;
  handleSaveComment: ({ id, version }: { id: string; version: string }, content: string) => void;
  handleManageQuote: (quote: string) => void;
}): EuiCommentProps => ({
  username: (
    <UserActionUsername
      username={comment.createdBy.username}
      fullName={comment.createdBy.fullName}
    />
  ),
  'data-test-subj': `comment-create-action-${comment.id}`,
  timestamp: <UserActionTimestamp createdAt={comment.createdAt} updatedAt={comment.updatedAt} />,
  className: classNames('userAction__comment', {
    outlined,
    isEdit,
  }),
  children: (
    <UserActionMarkdown
      ref={(element) => (commentRefs.current[comment.id] = element)}
      id={comment.id}
      content={comment.comment}
      isEditable={isEdit}
      onChangeEditable={handleManageMarkdownEditId}
      onSaveContent={handleSaveComment.bind(null, {
        id: comment.id,
        version: comment.version,
      })}
    />
  ),
  timelineIcon: (
    <UserActionAvatar username={comment.createdBy.username} fullName={comment.createdBy.fullName} />
  ),
  actions: (
    <UserActionContentToolbar
      id={comment.id}
      commentMarkdown={comment.comment}
      editLabel={i18n.EDIT_COMMENT}
      quoteLabel={i18n.QUOTE}
      isLoading={isLoading}
      onEdit={handleManageMarkdownEditId.bind(null, comment.id)}
      onQuote={handleManageQuote.bind(null, comment.comment)}
      userCanCrud={userCanCrud}
    />
  ),
});

const getAlertAttachmentUserAction = ({
  userAction,
  comment,
  alertData,
  getRuleDetailsHref,
  loadingAlertData,
  onRuleDetailsClick,
  onShowAlertDetails,
}: {
  userAction: UserActionResponse<CommentUserAction>;
  comment: SnakeToCamelCase<CommentResponseAlertsType>;
  alertData: Record<string, Ecs>;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  loadingAlertData: boolean;
  onShowAlertDetails: (alertId: string, index: string) => void;
}): EuiCommentProps => {
  // TODO: clean this up
  const alertId = Array.isArray(comment.alertId)
    ? comment.alertId.length > 0
      ? comment.alertId[0]
      : ''
    : comment.alertId;

  const alertIndex = Array.isArray(comment.index)
    ? comment.index.length > 0
      ? comment.index[0]
      : ''
    : comment.index;

  // if (isEmpty(alertId)) {
  //   return comments;
  // }

  const ruleId =
    comment?.rule?.id ??
    alertData[alertId]?.signal?.rule?.id?.[0] ??
    get(alertData[alertId], ALERT_RULE_UUID)[0] ??
    null;

  const ruleName =
    comment?.rule?.name ??
    alertData[alertId]?.signal?.rule?.name?.[0] ??
    get(alertData[alertId], ALERT_RULE_NAME)[0] ??
    null;

  return {
    username: (
      <UserActionUsernameWithAvatar
        username={userAction.createdBy.username}
        fullName={userAction.createdBy.fullName}
      />
    ),
    className: 'comment-alert',
    type: 'update',
    event: (
      <AlertCommentEvent
        alertId={alertId}
        getRuleDetailsHref={getRuleDetailsHref}
        loadingAlertData={loadingAlertData}
        onRuleDetailsClick={onRuleDetailsClick}
        ruleId={ruleId}
        ruleName={ruleName}
        commentType={CommentType.alert}
      />
    ),
    'data-test-subj': `${userAction.type}-${userAction.action}-action-${userAction.actionId}`,
    timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
    timelineIcon: 'bell',
    actions: (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <UserActionCopyLink id={userAction.actionId} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UserActionShowAlert
            id={userAction.actionId}
            alertId={alertId}
            index={alertIndex}
            onShowAlertDetails={onShowAlertDetails}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
};

const ActionIcon = React.memo<{
  actionType: string;
}>(({ actionType }) => {
  const theme = useContext(ThemeContext);
  return (
    <EuiToken
      style={{ marginTop: '8px' }}
      iconType={actionType === 'isolate' ? 'lock' : 'lockOpen'}
      size="m"
      shape="circle"
      color={theme.eui.euiColorLightestShade}
      data-test-subj="endpoint-action-icon"
    />
  );
});

ActionIcon.displayName = 'ActionIcon';

const getActionAttachmentUserAction = ({
  userAction,
  comment,
  actionsNavigation,
}: {
  userAction: UserActionResponse<CommentUserAction>;
  comment: SnakeToCamelCase<CommentResponseActionsType>;
  actionsNavigation?: ActionsNavigation;
}): EuiCommentProps => {
  return {
    username: (
      <UserActionUsernameWithAvatar
        username={comment.createdBy.username}
        fullName={comment.createdBy.fullName}
      />
    ),
    className: classNames('comment-action', {
      'empty-comment': comment.comment.trim().length === 0,
    }),
    event: (
      <HostIsolationCommentEvent
        type={comment.actions.type}
        endpoints={comment.actions.targets}
        href={actionsNavigation?.href}
        onClick={actionsNavigation?.onClick}
      />
    ),
    'data-test-subj': 'endpoint-action',
    timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
    timelineIcon: <ActionIcon actionType={comment.actions.type} />,
    actions: <UserActionCopyLink id={comment.id} />,
    children: comment.comment.trim().length > 0 && (
      <ContentWrapper data-test-subj="user-action-markdown">
        <MarkdownRenderer>{comment.comment}</MarkdownRenderer>
      </ContentWrapper>
    ),
  };
};

const getUpdateLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;

const getCreateCommentUserAction = ({
  userAction,
  comment,
  userCanCrud,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  isLoadingIds,
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
>): EuiCommentProps | undefined => {
  switch (comment.type) {
    case CommentType.user:
      return getUserAttachmentUserAction({
        comment,
        userCanCrud,
        outlined: comment.id === selectedOutlineCommentId,
        isEdit: manageMarkdownEditIds.includes(comment.id),
        commentRefs,
        isLoading: isLoadingIds.includes(comment.id),
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
      });

    case CommentType.alert:
      return getAlertAttachmentUserAction({
        alertData,
        comment,
        userAction,
        getRuleDetailsHref,
        loadingAlertData,
        onRuleDetailsClick,
        onShowAlertDetails,
      });
    case CommentType.actions:
      return getActionAttachmentUserAction({ userAction, comment, actionsNavigation });
    default:
      break;
  }
};

export const createCommentUserActionBuilder: UserActionBuilder = ({
  caseData,
  userAction,
  userCanCrud,
  commentRefs,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  isLoadingIds,
  loadingAlertData,
  alertData,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleOutlineComment,
}) => ({
  build: () => {
    const commentUserAction = userAction as UserActionResponse<CommentUserAction>;

    if (commentUserAction.action === Actions.create) {
      const comment = caseData.comments.find((c) => c.id === commentUserAction.commentId);
      if (comment != null) {
        const commentAction = getCreateCommentUserAction({
          userAction: commentUserAction,
          comment,
          userCanCrud,
          commentRefs,
          manageMarkdownEditIds,
          selectedOutlineCommentId,
          isLoadingIds,
          loadingAlertData,
          alertData,
          getRuleDetailsHref,
          onRuleDetailsClick,
          onShowAlertDetails,
          handleManageMarkdownEditId,
          handleSaveComment,
          handleManageQuote,
        });

        return commentAction != null ? [commentAction] : [];
      }
    }

    const label = getUpdateLabelTitle();
    const commonBuilder = createCommonUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return [commonBuilder.build()];
  },
});
