/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { ConversationRequestBase, Message } from '../../common/types';
import { AbortableAsyncState, useAbortableAsync } from './use_abortable_async';
import { ChatState } from './use_chat';
import type { UseGenAIConnectorsResult } from './use_genai_connectors';
import type { Conversation } from '../../common';

export function useContextualSuggestions({
  chatService,
  connectors,
  conversation,
  messages,
  state,
  signal,
}: {
  chatService: any;
  connectors: UseGenAIConnectorsResult;
  conversation: AbortableAsyncState<Conversation | ConversationRequestBase | undefined>;
  messages: Message[];
  state: ChatState;
  signal: AbortSignal | null;
}) {
  const [lastMessageContent, setLastMessageContent] = useState(
    messages[messages.length - 1]?.message.content
  );

  const [conversationId, setConversationId] = useState('');

  const suggestions = useAbortableAsync(() => {
    return connectors.selectedConnector &&
      conversation.value?.conversation &&
      'id' in conversation.value.conversation
      ? chatService.getContextualSuggestions({
          connectorId: connectors.selectedConnector,
          conversationId: conversation.value.conversation.id,
          signal,
        })
      : Promise.resolve([]);
  }, []);

  useEffect(() => {
    if (state !== ChatState.Loading) {
      if (lastMessageContent !== messages[messages.length - 1]?.message.content) {
        setLastMessageContent(messages[messages.length - 1]?.message.content);
        suggestions.refresh();
      }
    }
    if (
      conversation.value?.conversation &&
      'id' in conversation.value.conversation &&
      conversationId !== conversation.value.conversation.id
    ) {
      setConversationId(conversation.value?.conversation.id);
      suggestions.refresh();
    }
  }, [
    conversation.value?.conversation,
    conversationId,
    lastMessageContent,
    messages,
    state,
    suggestions,
  ]);

  return {
    value: suggestions.value,
    loading: suggestions.loading,
  };
}
