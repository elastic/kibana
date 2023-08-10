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
import { RenderFunction } from '../components/render_function';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { type Message, MessageRole } from '../../common';
import type { FunctionDefinition } from '../../common/types';

function convertFunctionParamsToMarkdownCodeBlock(object: Record<string, string | number>) {
  return `\`\`\`
${JSON.stringify(object, null, 4)}
\`\`\``;
}

export function getTimelineItemsfromConversation({
  currentUser,
  messages,
  hasConnector,
  functions,
}: {
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  messages: Message[];
  hasConnector: boolean;
  functions: FunctionDefinition[];
}): ChatTimelineItem[] {
  return [
    {
      id: v4(),
      '@timestamp': '',
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
      const id = v4();
      const role = message.message.role;

      let title: string = '';
      let content: string | undefined;
      let element: React.ReactNode | undefined;

      const functionCall = message.message.name
        ? messages[index - 1].message.function_call
        : message.message.function_call;

      let canCopy: boolean = false;
      let canEdit: boolean = false;
      let canGiveFeedback: boolean = false;
      let canRegenerate: boolean = false;
      let collapsed: boolean = false;
      let hide: boolean = false;

      switch (role) {
        case MessageRole.System:
          hide = true;
          break;

        case MessageRole.User:
          // is a prompt by the user
          if (!message.message.name) {
            title = '';
            content = message.message.content;

            canCopy = true;
            canEdit = hasConnector;
            canGiveFeedback = false;
            canRegenerate = false;
            collapsed = false;
            hide = false;
          } else {
            // user has executed a function
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

            const fn = functions.find((func) => func.options.name === message.message.name);

            element = fn?.render ? (
              <RenderFunction
                name={message.message.name}
                arguments={prevMessage.message.function_call.arguments}
                response={message.message}
              />
            ) : null;

            canCopy = true;
            canEdit = hasConnector;
            canGiveFeedback = true;
            canRegenerate = hasConnector;
            collapsed = !Boolean(element);
            hide = false;
          }
          break;

        case MessageRole.Assistant:
          // is a function suggestion by the assistant
          if (!!message.message.function_call?.name) {
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

            canCopy = true;
            canEdit = false;
            canGiveFeedback = true;
            canRegenerate = false;
            collapsed = true;
            hide = false;
          } else {
            // is an assistant response
            title = '';
            content = message.message.content;

            canCopy = true;
            canEdit = false;
            canGiveFeedback = true;
            canRegenerate = hasConnector;
            collapsed = false;
            hide = false;
          }
          break;
      }

      return {
        id,
        '@timestamp': message['@timestamp'],
        role,
        title,
        content,
        element,
        canCopy,
        canEdit,
        canGiveFeedback,
        canRegenerate,
        collapsed,
        currentUser,
        function_call: functionCall,
        hide,
        loading: false,
      };
    }),
  ];
}
