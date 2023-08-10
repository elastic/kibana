/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import { v4 } from 'uuid';
import { Message, MessageRole } from '../../common';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { RenderFunction } from '../components/render_function';

function convertFunctionParamsToMarkdownCodeBlock(object: Record<string, string | number>) {
  return `
\`\`\`
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
          // User executed a function:
          if (functionCall) {
            title = i18n.translate('xpack.observabilityAiAssistant.executedFunctionEvent', {
              defaultMessage: 'executed the function {functionName}',
              values: {
                functionName: functionCall.name,
              },
            });

            content = convertFunctionParamsToMarkdownCodeBlock({
              name: functionCall.name,
              arguments: JSON.parse(functionCall.arguments || '{}'),
            });

            element = (
              <RenderFunction
                name={functionCall.name}
                arguments={functionCall?.arguments}
                response={message.message}
              />
            );

            canCopy = true;
            canEdit = hasConnector;
            canGiveFeedback = true;
            canRegenerate = hasConnector;
            collapsed = !Boolean(element);
            hide = false;
          } else {
            // is a prompt by the user
            title = '';
            content = message.message.content;

            canCopy = true;
            canEdit = hasConnector;
            canGiveFeedback = false;
            canRegenerate = false;
            collapsed = false;
            hide = false;
          }

          break;

        case MessageRole.Assistant:
          // is a function suggestion by the assistant
          if (!!functionCall?.name) {
            title = i18n.translate('xpack.observabilityAiAssistant.suggestedFunctionEvent', {
              defaultMessage: 'suggested to use function {functionName}',
              values: {
                functionName: functionCall!.name,
              },
            });
            content =
              i18n.translate('xpack.observabilityAiAssistant.responseWas', {
                defaultMessage: 'Suggested the payload: ',
              }) +
              convertFunctionParamsToMarkdownCodeBlock({
                name: functionCall!.name,
                arguments: JSON.parse(functionCall?.arguments || '{}'),
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
