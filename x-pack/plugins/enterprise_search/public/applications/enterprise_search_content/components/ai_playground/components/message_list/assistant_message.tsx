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
import { EuiComment, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CopyActionButton } from './copy_action_button';
import type { Message as MessageType } from '../../types';

interface AssistantMessageProps extends Pick<MessageType, 'content' | 'createdAt'> {}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ content, createdAt }) => {
  return (
    <EuiComment
      username={i18n.translate(
        'xpack.enterpriseSearch.content.aiPlayground.message.assistant.username',
        {
          defaultMessage: 'AI',
        }
      )}
      event={i18n.translate('xpack.enterpriseSearch.content.aiPlayground.message.assistant.event', {
        defaultMessage: 'responded',
      })}
      timestamp={
        createdAt &&
        i18n.translate('xpack.enterpriseSearch.content.aiPlayground.message.assistant.createdAt', {
          defaultMessage: 'on {date}',
          values: {
            date: moment(createdAt).format('MMM DD, YYYY'),
          },
        })
      }
      timelineAvatar="compute"
      timelineAvatarAriaLabel={i18n.translate(
        'xpack.enterpriseSearch.content.aiPlayground.message.assistant.avatarAriaLabel',
        {
          defaultMessage: 'AI',
        }
      )}
      actions={
        <CopyActionButton
          copyText={String(content)}
          ariaLabel={i18n.translate(
            'xpack.enterpriseSearch.content.aiPlayground.message.assistant.copyLabel',
            { defaultMessage: 'Copy assistant message' }
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
