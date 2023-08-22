/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { v4 } from 'uuid';
import { isEmpty, omitBy } from 'lodash';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
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
    const content =
      message.role !== MessageRole.Assistant && message.content
        ? JSON.parse(message.content)
        : message.content;
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

function FunctionName({ name: functionName }: { name: string }) {
  const { euiTheme } = useEuiTheme();

  return <span style={{ fontFamily: euiTheme.font.familyCode, fontSize: 13 }}>{functionName}</span>;
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
      actions: { canCopy: false, canEdit: false, canGiveFeedback: false, canRegenerate: false },
      display: { collapsed: false, hide: false },
      currentUser,
      loading: false,
      role: MessageRole.User,
      title: i18n.translate('xpack.observabilityAiAssistant.conversationStartTitle', {
        defaultMessage: 'started a conversation',
      }),
    },
    ...messages.map((message, index) => {
      const id = v4();

      let title: React.ReactNode = '';
      let content: string | undefined;
      let element: React.ReactNode | undefined;

      const prevFunctionCall =
        message.message.name && messages[index - 1] && messages[index - 1].message.function_call
          ? messages[index - 1].message.function_call
          : undefined;

      const role = message.message.function_call?.trigger || message.message.role;

      const actions = {
        canCopy: false,
        canEdit: false,
        canGiveFeedback: false,
        canRegenerate: false,
      };

      const display = {
        collapsed: false,
        hide: false,
      };

      switch (role) {
        case MessageRole.System:
          display.hide = true;
          break;

        case MessageRole.User:
          actions.canCopy = true;
          actions.canGiveFeedback = false;
          actions.canRegenerate = false;

          display.hide = false;

          // User executed a function:
          if (message.message.name && prevFunctionCall) {
            let parsedContent;
            try {
              parsedContent = JSON.parse(message.message.content ?? 'null');
            } catch (error) {
              parsedContent = message.message.content;
            }

            const isError = typeof parsedContent === 'object' && 'error' in parsedContent;

            title = !isError ? (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.userExecutedFunctionEvent"
                defaultMessage="executed the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.name} />,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.executedFunctionFailureEvent"
                defaultMessage="failed to execute the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.name} />,
                }}
              />
            );

            element =
              !isError && chatService.hasRenderFunction(message.message.name) ? (
                <RenderFunction
                  name={message.message.name}
                  arguments={prevFunctionCall?.arguments}
                  response={message.message}
                />
              ) : undefined;

            content = !element ? convertMessageToMarkdownCodeBlock(message.message) : undefined;

            actions.canEdit = false;
            display.collapsed = !isError && !element;
          } else if (message.message.function_call) {
            // User suggested a function
            title = (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.userSuggestedFunctionEvent"
                defaultMessage="requested the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.function_call.name} />,
                }}
              />
            );

            content = convertMessageToMarkdownCodeBlock(message.message);

            actions.canEdit = hasConnector;
            display.collapsed = true;
          } else {
            // is a prompt by the user
            title = '';
            content = message.message.content;

            actions.canEdit = hasConnector;
            display.collapsed = false;
          }

          break;

        case MessageRole.Assistant:
          actions.canRegenerate = hasConnector;
          actions.canCopy = true;
          actions.canGiveFeedback = false;
          display.hide = false;

          // is a function suggestion by the assistant
          if (message.message.function_call?.name) {
            title = (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.suggestedFunctionEvent"
                defaultMessage="requested the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.function_call.name} />,
                }}
              />
            );
            content = convertMessageToMarkdownCodeBlock(message.message);

            display.collapsed = true;
            actions.canEdit = true;
          } else {
            // is an assistant response
            title = '';
            content = message.message.content;
            display.collapsed = false;
            actions.canEdit = false;
          }
          break;
      }

      return {
        id,
        role,
        title,
        content,
        element,
        actions,
        display,
        currentUser,
        function_call: message.message.function_call,
        loading: false,
      };
    }),
  ];
}
