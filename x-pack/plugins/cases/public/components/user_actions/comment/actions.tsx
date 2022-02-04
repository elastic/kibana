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
import { CommentResponseActionsType } from '../../../../common/api';
import { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import { SnakeToCamelCase } from '../../../../common/types';
import { UserActionUsernameWithAvatar } from '../avatar_username';
import { UserActionCopyLink } from '../copy_link';
import { MarkdownRenderer } from '../../markdown_editor';
import { ContentWrapper } from '../markdown_form';
import { HostIsolationCommentEvent } from './host_isolation_event';

type BuilderArgs = Pick<UserActionBuilderArgs, 'userAction' | 'actionsNavigation'> & {
  comment: SnakeToCamelCase<CommentResponseActionsType>;
};

export const createActionAttachmentUserActionBuilder = ({
  userAction,
  comment,
  actionsNavigation,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  build: () => {
    return [
      {
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
