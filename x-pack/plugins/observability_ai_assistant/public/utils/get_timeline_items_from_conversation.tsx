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
import { type Message, MessageRole } from '../../common';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { RenderFunction } from '../components/render_function';

function convertFunctionParamsToMarkdownCodeBlock(object: Record<string, string | number>) {
  return `\`\`\`
${JSON.stringify(object, null, 4)}
\`\`\``;
}

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
      canCopy: false,
      canEdit: false,
      canGiveFeedback: false,
      canRegenerate: false,
      collapsed: false,
      currentUser,
      hide: false,
      loading: false,
      role: MessageRole.User,
      title: i18n.translate('xpack.observabilityAiAssistant.conversationStartTitle', {
        defaultMessage: 'started a conversation',
      }),
    },
    ...messages.map((message, index) => {
      const hasFunction = !!message.message.function_call?.name;
      const isSystemPrompt = message.message.role === MessageRole.System;

      let title: string;
      let content: string | undefined;
      let element: React.ReactNode | undefined;
      let collapsed: boolean = false;

      if (hasFunction) {
        title = i18n.translate('xpack.observabilityAiAssistant.suggestedFunctionEvent', {
          defaultMessage: 'suggested to use function {functionName}',
          values: {
            functionName: message.message.function_call!.name,
          },
        });

        content = convertFunctionParamsToMarkdownCodeBlock({
          name: message.message.function_call!.name,
          arguments: JSON.parse(message.message.function_call?.arguments || '{}'),
        });

        collapsed = true;
      } else if (isSystemPrompt) {
        title = i18n.translate('xpack.observabilityAiAssistant.addedSystemPromptEvent', {
          defaultMessage: 'added a prompt',
        });
        content = '';
        collapsed = true;
      } else if (message.message.name) {
        const prevMessage = messages[index - 1];
        if (!prevMessage || !prevMessage.message.function_call) {
          throw new Error('Could not find preceding message with function_call');
        }

        title = i18n.translate('xpack.observabilityAiAssistant.executedFunctionEvent', {
          defaultMessage: 'executed the function {functionName}',
          values: {
            functionName: prevMessage.message.function_call!.name,
          },
        });

        content = convertFunctionParamsToMarkdownCodeBlock(
          JSON.parse(message.message.content || '{}')
        );

        element = (
          <RenderFunction
            name={message.message.name}
            arguments={prevMessage.message.function_call.arguments}
            response={message.message}
          />
        );
        collapsed = true;
      } else {
        title = '';
        content = message.message.content;
        collapsed = false;
      }

      const props = {
        id: v4(),
        canCopy: true,
        canEdit: hasConnector && (message.message.role === MessageRole.User || hasFunction),
        canGiveFeedback:
          message.message.role === MessageRole.Assistant ||
          message.message.role === MessageRole.Elastic,
        canRegenerate:
          (hasConnector && message.message.role === MessageRole.Assistant) ||
          message.message.role === MessageRole.Elastic,
        collapsed,
        content,
        currentUser,
        element,
        functionCall: message.message.name
          ? messages[index - 1].message.function_call
          : message.message.function_call,
        hide: Boolean(message.message.isAssistantSetupMessage),
        loading: false,
        role: message.message.role,
        title,
      };

      return props;
    }),
  ];
}
