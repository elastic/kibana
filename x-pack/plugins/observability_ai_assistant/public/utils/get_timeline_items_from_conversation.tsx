/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { isEmpty, omitBy } from 'lodash';
import React from 'react';
import { v4 } from 'uuid';
import { Message, MessageRole } from '../../common';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { RenderFunction } from '../components/render_function';
import type { ObservabilityAIAssistantChatService } from '../types';

function convertMessageToMarkdownCodeBlock(message: Message['message']) {
  let value: object;

  if (!message.name) {
    const name = message.function_call?.name;
    const args = message.function_call?.arguments
      ? JSON.parse(message.function_call.arguments)
      : undefined;

    value = {
      name,
      args,
    };
  } else {
    const content = message.content ? JSON.parse(message.content) : undefined;
    const data = message.data ? JSON.parse(message.data) : undefined;
    value = omitBy(
      {
        content,
        data,
      },
      isEmpty
    );
  }

  return `\`\`\`\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

export function getTimelineItemsfromConversation({
  currentUser,
  messages,
  hasConnector,
  chatService,
}: {
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  messages: Message[];
  hasConnector: boolean;
  chatService: ObservabilityAIAssistantChatService;
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
      const id = v4();

      let title: string = '';
      let content: string | undefined;
      let element: React.ReactNode | undefined;

      const role = message.message.name ? message.message.role : message.message.role;
      const functionCall =
        message.message.name && messages[index - 1] && messages[index - 1].message.function_call
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
          canCopy = true;
          canGiveFeedback = false;
          canRegenerate = false;
          hide = false;
          // User executed a function:

          if (message.message.name && functionCall) {
            const parsedContent = JSON.parse(message.message.content ?? 'null');
            const isError = !!(parsedContent && 'error' in parsedContent);

            title = !isError
              ? i18n.translate('xpack.observabilityAiAssistant.executedFunctionEvent', {
                  defaultMessage: 'executed the function {functionName}',
                  values: {
                    functionName: message.message.name,
                  },
                })
              : i18n.translate('xpack.observabilityAiAssistant.executedFunctionFailureEvent', {
                  defaultMessage: 'failed to execute the function {functionName}',
                  values: {
                    functionName: message.message.name,
                  },
                });

            element =
              !isError && chatService.hasRenderFunction(message.message.name) ? (
                <RenderFunction
                  name={message.message.name}
                  arguments={functionCall?.arguments}
                  response={message.message}
                />
              ) : undefined;

            content = !element ? convertMessageToMarkdownCodeBlock(message.message) : undefined;

            canEdit = false;
            collapsed = !isError && !element;
          } else {
            // is a prompt by the user
            title = '';
            content = message.message.content;

            canEdit = hasConnector;
            collapsed = false;
          }

          break;

        case MessageRole.Assistant:
          canRegenerate = hasConnector;
          canCopy = true;
          canGiveFeedback = true;
          hide = false;
          // is a function suggestion by the assistant
          if (!!functionCall?.name) {
            title = i18n.translate('xpack.observabilityAiAssistant.suggestedFunctionEvent', {
              defaultMessage: 'suggested to use function {functionName}',
              values: {
                functionName: functionCall!.name,
              },
            });
            content = convertMessageToMarkdownCodeBlock(message.message);

            collapsed = true;
            canEdit = true;
          } else {
            // is an assistant response
            title = '';
            content = message.message.content;
            collapsed = false;
            canEdit = false;
          }
          break;
      }

      return {
        id,
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
