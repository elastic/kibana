/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { omit } from 'lodash';
import { useMemo, useState } from 'react';
import { MessageRole, type ConversationCreateRequest, type Message } from '../../common/types';
import type { ChatPromptEditorProps } from '../components/chat/chat_prompt_editor';
import type { ChatTimelineProps } from '../components/chat/chat_timeline';
import { getTimelineItemsfromConversation } from '../utils/get_timeline_items_from_conversation';
import type { UseChatResult } from './use_chat';
import type { UseGenAIConnectorsResult } from './use_genai_connectors';

export function createNewConversation(): ConversationCreateRequest {
  return {
    '@timestamp': new Date().toISOString(),
    messages: [],
    conversation: {
      title: '',
    },
    labels: {},
    numeric_labels: {},
  };
}

export type UseTimelineResult = Pick<
  ChatTimelineProps,
  'onEdit' | 'onFeedback' | 'onRegenerate' | 'onStopGenerating' | 'items'
> &
  Pick<ChatPromptEditorProps, 'onSubmit'>;

export function useTimeline({
  initialConversation,
  connectors,
  currentUser,
  chat,
}: {
  initialConversation?: ConversationCreateRequest;
  connectors: UseGenAIConnectorsResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  chat: UseChatResult;
}): UseTimelineResult {
  const connectorId = connectors.selectedConnector;

  const hasConnector = !!connectorId;

  const [conversation, setConversation] = useState(initialConversation || createNewConversation());

  const conversationItems = useMemo(() => {
    return getTimelineItemsfromConversation({
      conversation,
      currentUser,
      hasConnector,
    });
  }, [conversation, currentUser, hasConnector]);

  const items = useMemo(() => {
    if (chat.loading) {
      return conversationItems.concat({
        id: '',
        canEdit: false,
        canRegenerate: !chat.loading,
        canGiveFeedback: !chat.loading,
        role: MessageRole.Assistant,
        title: '',
        content: chat.content ?? '',
        loading: chat.loading,
        currentUser,
      });
    }

    return conversationItems;
  }, [conversationItems, chat.content, chat.loading, currentUser]);

  function getNextMessage(
    role: MessageRole,
    response: Awaited<ReturnType<UseChatResult['generate']>>
  ) {
    const nextMessage: Message = {
      '@timestamp': new Date().toISOString(),
      message: {
        role,
        content: response.content,
        ...omit(response, 'function_call'),
        ...(response.function_call && response.function_call.name
          ? {
              function_call: {
                ...response.function_call,
                args: response.function_call.args
                  ? JSON.parse(response.function_call.args)
                  : undefined,
                trigger: MessageRole.Assistant,
              },
            }
          : {}),
      },
    };

    return nextMessage;
  }

  return {
    items,
    onEdit: (item, content) => {},
    onFeedback: (item, feedback) => {},
    onRegenerate: (item) => {
      const indexOf = items.indexOf(item);

      const messages = conversation.messages.slice(0, indexOf - 1);

      setConversation((conv) => ({ ...conv, messages }));

      chat
        .generate({
          messages,
          connectorId: connectors.selectedConnector!,
        })
        .then((response) => {
          setConversation((conv) => ({
            ...conv,
            messages: conv.messages.concat(getNextMessage(MessageRole.Assistant, response)),
          }));
        });
    },
    onStopGenerating: () => {
      chat.abort();
    },
    onSubmit: async ({ content }) => {
      if (connectorId) {
        const nextMessage = getNextMessage(MessageRole.User, { content });

        setConversation((conv) => ({ ...conv, messages: conv.messages.concat(nextMessage) }));

        const response = await chat.generate({
          messages: conversation.messages.concat(nextMessage),
          connectorId,
        });

        setConversation((conv) => ({
          ...conv,
          messages: conv.messages.concat(getNextMessage(MessageRole.Assistant, response)),
        }));
      }
    },
  };
}
