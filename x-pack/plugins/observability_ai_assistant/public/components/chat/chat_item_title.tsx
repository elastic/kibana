/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { Message, MessageRole } from '../../../common/types';

interface ChatItemTitleProps {
  dateFormat: string;
  index: number;
  message: Message;
}

export function ChatItemTitle({ dateFormat, index, message }: ChatItemTitleProps) {
  switch (message.message.role) {
    case MessageRole.User:
      if (index === 0) {
        return i18n.translate(
          'xpack.observabilityAiAssistant.chatTimeline.messages.user.createdNewConversation',
          {
            defaultMessage: 'created a new conversation on {date}',
            values: {
              date: moment(message['@timestamp']).format(dateFormat),
            },
          }
        );
      } else {
        return i18n.translate(
          'xpack.observabilityAiAssistant.chatTimeline.messages.user.addedPrompt',
          {
            defaultMessage: 'added a prompt on {date}',
            values: {
              date: moment(message['@timestamp']).format(dateFormat),
            },
          }
        );
      }

    case MessageRole.Assistant:
    case MessageRole.Elastic:
    case MessageRole.Function:
      return i18n.translate(
        'xpack.observabilityAiAssistant.chatTimeline.messages.elasticAssistant.responded',
        {
          defaultMessage: 'responded on {date}',
          values: {
            date: moment(message['@timestamp']).format(dateFormat),
          },
        }
      );

    case MessageRole.System:
      return i18n.translate('xpack.observabilityAiAssistant.chatTimeline.messages.system.added', {
        defaultMessage: 'added {thing} on {date}',
        values: {
          date: moment(message['@timestamp']).format(dateFormat),
          thing: message.message.content,
        },
      });

    default:
      return '';
  }
}
