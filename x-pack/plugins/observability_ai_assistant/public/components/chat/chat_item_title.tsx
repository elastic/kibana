/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { Message, MessageRole } from '../../../common/types';

interface ChatItemTitleProps {
  actionsTrigger?: ReactNode;
  dateFormat: string;
  index: number;
  message: Message;
}

export function ChatItemTitle({ actionsTrigger, dateFormat, index, message }: ChatItemTitleProps) {
  let content: string = '';

  switch (message.message.role) {
    case MessageRole.User:
      if (index === 0) {
        content = i18n.translate(
          'xpack.observabilityAiAssistant.chatTimeline.messages.user.createdNewConversation',
          {
            defaultMessage: 'created a new conversation on {date}',
            values: {
              date: moment(message['@timestamp']).format(dateFormat),
            },
          }
        );
      } else {
        content = i18n.translate(
          'xpack.observabilityAiAssistant.chatTimeline.messages.user.addedPrompt',
          {
            defaultMessage: 'added a message on {date}',
            values: {
              date: moment(message['@timestamp']).format(dateFormat),
            },
          }
        );
      }
      break;

    case MessageRole.Assistant:
    case MessageRole.Elastic:
    case MessageRole.Function:
      content = i18n.translate(
        'xpack.observabilityAiAssistant.chatTimeline.messages.elasticAssistant.responded',
        {
          defaultMessage: 'responded on {date}',
          values: {
            date: moment(message['@timestamp']).format(dateFormat),
          },
        }
      );
      break;

    case MessageRole.System:
      content = i18n.translate(
        'xpack.observabilityAiAssistant.chatTimeline.messages.system.added',
        {
          defaultMessage: 'added {thing} on {date}',
          values: {
            date: moment(message['@timestamp']).format(dateFormat),
            thing: message.message.content,
          },
        }
      );
      break;

    default:
      content = '';
      break;
  }
  return (
    <>
      {content}

      {actionsTrigger ? (
        <div css={{ position: 'absolute', top: 2, right: euiThemeVars.euiSizeS }}>
          {actionsTrigger}
        </div>
      ) : null}
    </>
  );
}
