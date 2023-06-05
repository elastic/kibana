/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';

import type { CommentResponseActionsType } from '../../../../common/api';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { UserActionCopyLink } from '../copy_link';
import { ScrollableMarkdown } from '../../markdown_editor';
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
    const actionIconName = comment.actions.type === 'isolate' ? 'lock' : 'lockOpen';
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
        timelineAvatar: actionIconName,
        timelineAvatarAriaLabel: actionIconName,
        actions: <UserActionCopyLink id={comment.id} />,
        children: comment.comment.trim().length > 0 && (
          <ScrollableMarkdown content={comment.comment} />
        ),
      },
    ];
  },
});
