/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Replacements,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';
import { AgentState, NodeParamsBase } from '../types';
import { AIAssistantConversationsDataClient } from '../../../../../ai_assistant_data_clients/conversations';
import { getLangChainMessages } from '../../../helpers';
import { NodeType } from '../constants';

export interface PersistConversationChangesParams extends NodeParamsBase {
  state: AgentState;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  replacements?: Replacements;
}

export async function persistConversationChanges({
  logger,
  state,
  conversationsDataClient,
  replacements = {},
}: PersistConversationChangesParams): Promise<Partial<AgentState>> {
  logger.debug(
    () => `${NodeType.PERSIST_CONVERSATION_CHANGES}: Node state:\n${JSON.stringify(state, null, 2)}`
  );

  if (!state.conversation || !state.conversationId) {
    logger.debug('No need to generate chat title, conversationId is undefined');
    return {
      conversation: undefined,
      messages: [],
      lastNode: NodeType.PERSIST_CONVERSATION_CHANGES,
    };
  }

  let conversation;
  if (state.conversation?.title !== state.chatTitle) {
    conversation = await conversationsDataClient?.updateConversation({
      conversationUpdateProps: {
        id: state.conversationId,
        title: state.chatTitle,
      },
    });
  }

  const lastMessage = state.conversation.messages
    ? state.conversation.messages[state.conversation.messages.length - 1]
    : undefined;
  if (lastMessage && lastMessage.content === state.input && lastMessage.role === 'user') {
    // this is a regenerated message, do not update the conversation again
    const langChainMessages = getLangChainMessages(state.conversation.messages ?? []);
    const messages = langChainMessages.slice(0, -1); // all but the last message
    return {
      conversation: state.conversation,
      messages,
      lastNode: NodeType.PERSIST_CONVERSATION_CHANGES,
    };
  }

  const updatedConversation = await conversationsDataClient?.appendConversationMessages({
    existingConversation: conversation ? conversation : state.conversation,
    messages: [
      {
        content: replaceAnonymizedValuesWithOriginalValues({
          messageContent: state.input,
          replacements,
        }),
        role: 'user',
        timestamp: new Date().toISOString(),
      },
    ],
  });
  if (!updatedConversation) {
    logger.debug('Not updated conversation');
    return {
      conversation: undefined,
      messages: [],
      lastNode: NodeType.PERSIST_CONVERSATION_CHANGES,
    };
  }

  logger.debug(`conversationId: ${state.conversationId}`);
  const langChainMessages = getLangChainMessages(updatedConversation.messages ?? []);
  const messages = langChainMessages.slice(0, -1); // all but the last message

  return {
    conversation: updatedConversation,
    messages,
    lastNode: NodeType.PERSIST_CONVERSATION_CHANGES,
  };
}
