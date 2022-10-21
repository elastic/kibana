/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import classNames from 'classnames';
import { ThemeContext } from 'styled-components';

import { EuiToken } from '@elastic/eui';
import type { CommentResponseActionsType } from '../../../../common/api';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { UserActionCopyLink } from '../copy_link';
import { MarkdownRenderer } from '../../markdown_editor';
import { ContentWrapper } from '../markdown_form';
import { HostIsolationCommentEvent } from './host_isolation_event';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'actionsNavigation' | 'userProfiles'
> & {
  comment: SnakeToCamelCase<CommentResponseActionsType>;
};

export const createActionAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  comment,
  actionsNavigation,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  build: () => {
    return [
      {
        username: (
          <HoverableUserWithAvatarResolver user={comment.createdBy} userProfiles={userProfiles} />
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
        timelineAvatar: <ActionIcon actionType={comment.actions.type} />,
        actions: <UserActionCopyLink id={comment.id} />,
        children: comment.comment.trim().length > 0 && (
          <ContentWrapper data-test-subj="user-action-markdown">
            <MarkdownRenderer>{comment.comment}</MarkdownRenderer>
          </ContentWrapper>
        ),
      },
    ];
  },
});

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
