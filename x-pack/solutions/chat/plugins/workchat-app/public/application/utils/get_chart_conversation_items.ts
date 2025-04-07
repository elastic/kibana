/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ConversationEvent,
  isAssistantMessage,
  isUserMessage,
  isToolResult,
  createAssistantMessage,
} from '../../../common/conversation_events';
import type { ProgressionEvent } from '../../../common/chat_events';
import type { ChatStatus } from '../hooks/use_chat';
import {
  type ConversationItem,
  type ToolCallConversationItem,
  createUserMessageItem,
  createAssistantMessageItem,
  createToolCallItem,
  createProgressionItem,
  isAssistantMessageItem,
  isToolCallItem,
  isProgressionItem,
} from './conversation_items';

/**
 * Utility function preparing the data to display the chat conversation
 */
export const getChartConversationItems = ({
  conversationEvents,
  progressionEvents,
  chatStatus,
}: {
  conversationEvents: ConversationEvent[];
  progressionEvents: ProgressionEvent[];
  chatStatus: ChatStatus;
}): ConversationItem[] => {
  const toolCallMap = new Map<string, ToolCallConversationItem>();

  const items = conversationEvents.reduce<ConversationItem[]>((list, item) => {
    if (isUserMessage(item)) {
      list.push(createUserMessageItem({ message: item }));
    }

    if (isAssistantMessage(item)) {
      if (item.content) {
        list.push(createAssistantMessageItem({ message: item }));
      }
      for (const toolCall of item.toolCalls) {
        const toolCallItem = createToolCallItem({ messageId: item.id, toolCall });
        toolCallMap.set(toolCallItem.toolCall.toolCallId, toolCallItem);
        list.push(toolCallItem);
      }
    }

    if (isToolResult(item)) {
      const toolCallItem = toolCallMap.get(item.toolCallId);
      if (toolCallItem) {
        toolCallItem.toolResult = item.toolResult;
      }
    }

    return list;
  }, []);

  if (progressionEvents.length > 0 && chatStatus === 'loading') {
    items.push(createProgressionItem({ progressionEvents }));
  }

  if (chatStatus === 'loading') {
    const lastItem = items[items.length - 1];
    if (isAssistantMessageItem(lastItem) || isProgressionItem(lastItem)) {
      lastItem.loading = true;
    } else if (isToolCallItem(lastItem) && !lastItem.toolResult) {
      lastItem.loading = true;
    } else {
      // need to insert loading placeholder
      items.push(
        createAssistantMessageItem({
          message: createAssistantMessage({ content: '' }),
          loading: true,
        })
      );
    }
  }

  return items;
};
