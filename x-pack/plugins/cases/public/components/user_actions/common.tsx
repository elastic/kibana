/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../common/types';
import type { UserActionAction, ConnectorUserAction } from '../../../common/types/domain';
import { UserActionActions } from '../../../common/types/domain';
import { UserActionTimestamp } from './timestamp';
import type { UserActionBuilder, UserActionBuilderArgs } from './types';
import { UserActionCopyLink } from './copy_link';
import { UserActionMoveToReference } from './move_to_reference';
import { HoverableUserWithAvatarResolver } from '../user_profiles/hoverable_user_with_avatar_resolver';
import { getUserActionAriaLabel } from './user_actions_aria_labels';

interface Props {
  userAction: SnakeToCamelCase<ConnectorUserAction>;
  handleOutlineComment: (id: string) => void;
}

const showMoveToReference = (
  action: UserActionAction,
  commentId: string | null
): commentId is string => action === UserActionActions.update && commentId != null;

const CommentListActions: React.FC<Props> = React.memo(({ userAction, handleOutlineComment }) => (
  <EuiFlexGroup responsive={false}>
    <EuiFlexItem grow={false}>
      <UserActionCopyLink id={userAction.id} />
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
    build: () => [
      {
        username: (
          <HoverableUserWithAvatarResolver
            user={userAction.createdBy}
            userProfiles={userProfiles}
          />
        ),
        event: label,
        'data-test-subj': `${userAction.type}-${userAction.action}-action-${userAction.id}`,
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineAvatar: icon,
        timelineAvatarAriaLabel: getUserActionAriaLabel(userAction.type),
        actions: (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <UserActionCopyLink id={userAction.id} />
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
