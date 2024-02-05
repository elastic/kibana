/*
 *
 *  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 *  * or more contributor license agreements. Licensed under the Elastic License
 *  * 2.0; you may not use this file except in compliance with the Elastic License
 *  * 2.0.
 *
 */

import React from 'react';
import moment from 'moment';
import { EuiAvatar, EuiComment, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CopyActionButton } from './copy_action_button';
import type { Message as MessageType } from '../../types';

interface UserMessageProps extends Pick<MessageType, 'content' | 'createdAt'> {}

export const UserMessage: React.FC<UserMessageProps> = ({ content, createdAt }) => {
  const username = 'User';

  return (
    <EuiComment
      username={username}
      event={i18n.translate('xpack.enterpriseSearch.content.aiPlayground.message.user.event', {
        defaultMessage: 'asked',
      })}
      timestamp={
        createdAt &&
        i18n.translate('xpack.enterpriseSearch.content.aiPlayground.message.user.createdAt', {
          defaultMessage: 'on {date}',
          values: {
            date: moment(createdAt).format('MMM DD, YYYY'),
          },
        })
      }
      timelineAvatar={<EuiAvatar name={username} initialsLength={2} />}
      timelineAvatarAriaLabel={username}
      actions={
        <CopyActionButton
          copyText={String(content)}
          ariaLabel={i18n.translate(
            'xpack.enterpriseSearch.content.aiPlayground.message.user.copyLabel',
            { defaultMessage: 'Copy user message' }
          )}
        />
      }
    >
      <EuiText size="s">
        <p>{content}</p>
      </EuiText>
    </EuiComment>
  );
};
