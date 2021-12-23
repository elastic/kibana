/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Actions, ConnectorUserAction } from '../../../common/api';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionResponse } from './types';
import { UserActionUsernameWithAvatar } from './user_action_username_with_avatar';
import { UserActionCopyLink } from './user_action_copy_link';
import { UserActionMoveToReference } from './user_action_move_to_reference';
import { CaseUserActions } from '../../containers/types';

interface Props {
  userAction: UserActionResponse<ConnectorUserAction>;
  handleOutlineComment: (id: string) => void;
}

const CommentListActions: React.FC<Props> = React.memo(({ userAction, handleOutlineComment }) => (
  <EuiFlexGroup responsive={false}>
    <EuiFlexItem grow={false}>
      <UserActionCopyLink id={userAction.actionId} />
    </EuiFlexItem>
    {userAction.action === Actions.update && userAction.commentId != null && (
      <EuiFlexItem grow={false}>
        <UserActionMoveToReference
          id={userAction.commentId}
          outlineComment={handleOutlineComment}
        />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
));

CommentListActions.displayName = 'CommentListActions';

export const createCommonUserActionBuilder = ({
  userAction,
  label,
  icon,
  handleOutlineComment,
}: {
  userAction: CaseUserActions;
  label: EuiCommentProps['event'];
  icon: EuiCommentProps['timelineIcon'];
  handleOutlineComment: (id: string) => void;
}) => ({
  build: () => ({
    username: (
      <UserActionUsernameWithAvatar
        username={userAction.createdBy.username}
        fullName={userAction.createdBy.fullName}
      />
    ),
    type: 'update' as const,
    event: label,
    'data-test-subj': `${userAction.type}-${userAction.action}-action-${userAction.actionId}`,
    timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
    timelineIcon: icon,
    actions: (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <UserActionCopyLink id={userAction.actionId} />
        </EuiFlexItem>
        {userAction.action === Actions.update && userAction.commentId != null && (
          <EuiFlexItem grow={false}>
            <UserActionMoveToReference
              id={userAction.commentId}
              outlineComment={handleOutlineComment}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  }),
});
