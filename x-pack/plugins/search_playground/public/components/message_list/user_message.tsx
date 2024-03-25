/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import moment from 'moment';

import { EuiComment, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserAvatar, UserProfileWithAvatar } from '@kbn/user-profile-components';

import type { Message as MessageType } from '../../types';

import { CopyActionButton } from './copy_action_button';
import { useKibana } from '../../hooks/use_kibana';

type UserMessageProps = Pick<MessageType, 'content' | 'createdAt'>;

export const UserMessage: React.FC<UserMessageProps> = ({ content, createdAt }) => {
  const { services } = useKibana();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileWithAvatar>();

  useEffect(() => {
    services.security?.userProfiles.getCurrent({ dataPath: 'avatar' }).then(setCurrentUserProfile);
  }, [services]);

  return (
    <EuiComment
      username={currentUserProfile?.user.username}
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
