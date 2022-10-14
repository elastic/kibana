/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { ConnectorUserAction, UserAction } from '../../../common/api';
import { Actions } from '../../../common/api';
import { UserActionTimestamp } from './timestamp';
import type { UserActionBuilder, UserActionBuilderArgs, UserActionResponse } from './types';
import { UserActionCopyLink } from './copy_link';
import { UserActionMoveToReference } from './move_to_reference';
import { HoverableUserWithAvatarResolver } from '../user_profiles/hoverable_user_with_avatar_resolver';

interface Props {
  userAction: UserActionResponse<ConnectorUserAction>;
  handleOutlineComment: (id: string) => void;
}

const showMoveToReference = (action: UserAction, commentId: string | null): commentId is string =>
  action === Actions.update && commentId != null;

const CommentListActions: React.FC<Props> = React.memo(({ userAction, handleOutlineComment }) => (
  <EuiFlexGroup responsive={false}>
    <EuiFlexItem grow={false}>
      <UserActionCopyLink id={userAction.actionId} />
    </EuiFlexItem>
    {showMoveToReference(userAction.action, userAction.commentId) && (
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

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'handleOutlineComment' | 'userProfiles'
> & {
  label: EuiCommentProps['event'];
  icon: EuiCommentProps['timelineAvatar'];
};

export const createCommonUpdateUserActionBuilder = ({
  userProfiles,
  userAction,
  label,
  icon,
  handleOutlineComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return {
    // eslint-disable-next-line react/display-name
    build: () => [
      {
        username: (
          <HoverableUserWithAvatarResolver
            user={userAction.createdBy}
            userProfiles={userProfiles}
          />
        ),
        event: label,
        'data-test-subj': `${userAction.type}-${userAction.action}-action-${userAction.actionId}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineAvatar: icon,
        actions: (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <UserActionCopyLink id={userAction.actionId} />
            </EuiFlexItem>
            {showMoveToReference(userAction.action, userAction.commentId) && (
              <EuiFlexItem grow={false}>
                <UserActionMoveToReference
                  id={userAction.commentId}
                  outlineComment={handleOutlineComment}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
    ],
  };
};
