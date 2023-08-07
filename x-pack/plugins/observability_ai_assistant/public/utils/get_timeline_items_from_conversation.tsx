/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { v4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import dedent from 'dedent';
import { type Message, MessageRole } from '../../common';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { RenderFunction } from '../components/render_function';

export function getTimelineItemsfromConversation({
  currentUser,
  messages,
  hasConnector,
}: {
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  messages: Message[];
  hasConnector: boolean;
}): ChatTimelineItem[] {
  return [
    {
      id: v4(),
      role: MessageRole.User,
      title: i18n.translate('xpack.observabilityAiAssistant.conversationStartTitle', {
        defaultMessage: 'started a conversation',
      }),
      canEdit: false,
      canGiveFeedback: false,
      canRegenerate: false,
      loading: false,
      currentUser,
    },
    ...messages.map((message, index) => {
      const hasFunction = !!message.message.function_call?.name;
      const isSystemPrompt = message.message.role === MessageRole.System;

      let title: string;
      let content: string | undefined;
      let element: React.ReactNode | undefined;

      if (hasFunction) {
        title = i18n.translate('xpack.observabilityAiAssistant.suggestedFunctionEvent', {
          defaultMessage: 'suggested a function',
        });
        content = dedent(`I have requested your system performs the function _${
          message.message.function_call?.name
        }_ with the payload 
        \`\`\`
        ${JSON.stringify(JSON.parse(message.message.function_call?.arguments || ''), null, 4)}
        \`\`\`
        and return its results for me to look at.`);
      } else if (isSystemPrompt) {
        title = i18n.translate('xpack.observabilityAiAssistant.addedSystemPromptEvent', {
          defaultMessage: 'added a prompt',
        });
        content = '';
      } else if (message.message.name) {
        const prevMessage = messages[index - 1];
        if (!prevMessage || !prevMessage.message.function_call) {
          throw new Error('Could not find preceding message with function_call');
        }
        title = i18n.translate('xpack.observabilityAiAssistant.executedFunctionEvent', {
          defaultMessage: 'Executed a function',
        });
        content = message.message.content;
        element = (
          <RenderFunction
            name={message.message.name}
            arguments={prevMessage.message.function_call.arguments}
            response={message.message}
          />
        );
      } else {
        title = '';
        content = message.message.content;
      }

      const props = {
        id: v4(),
        role: message.message.role,
        canEdit: hasConnector && (message.message.role === MessageRole.User || hasFunction),
        canRegenerate: hasConnector && message.message.role === MessageRole.Assistant,
        canGiveFeedback: message.message.role === MessageRole.Assistant,
        loading: false,
        title,
        content,
        currentUser,
        element,
      };

      return props;
    }),
  ];
}
