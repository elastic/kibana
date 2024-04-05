/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import moment from 'moment';

import { EuiComment, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserAvatar } from '@kbn/user-profile-components';

import { useUserProfile } from '../../hooks/use_user_profile';
import type { Message as MessageType } from '../../types';

import { CopyActionButton } from './copy_action_button';

type UserMessageProps = Pick<MessageType, 'content' | 'createdAt'>;

export const UserMessage: React.FC<UserMessageProps> = ({ content, createdAt }) => {
  const currentUserProfile = useUserProfile();

  return (
    <EuiComment
      username={i18n.translate('xpack.searchPlayground.chat.message.user.name', {
        defaultMessage: 'You',
      })}
      event={i18n.translate('xpack.searchPlayground.chat.message.user.event', {
        defaultMessage: 'asked',
      })}
      timestamp={
        createdAt &&
        i18n.translate('xpack.searchPlayground.chat.message.user.createdAt', {
          defaultMessage: 'on {date}',
          values: {
            date: moment(createdAt).format('MMM DD, YYYY'),
          },
        })
      }
      timelineAvatar={
        <UserAvatar user={currentUserProfile?.user} avatar={currentUserProfile?.data.avatar} />
      }
      timelineAvatarAriaLabel={currentUserProfile?.user.username}
      actions={
        <CopyActionButton
          copyText={String(content)}
          ariaLabel={i18n.translate('xpack.searchPlayground.chat.message.user.copyLabel', {
            defaultMessage: 'Copy user message',
          })}
        />
      }
    >
      <EuiText size="s">
        <p>{content}</p>
      </EuiText>
    </EuiComment>
  );
};
