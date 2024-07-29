/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentState, NodeParamsBase } from '../types';
import { AIAssistantConversationsDataClient } from '../../../../../ai_assistant_data_clients/conversations';
import { getLangChainMessages } from '../../../helpers';

export interface GetPersistedConversationParams extends NodeParamsBase {
  conversationsDataClient?: AIAssistantConversationsDataClient;
  conversationId?: string;
  state: AgentState;
}

export const GET_PERSISTED_CONVERSATION_NODE = 'getPersistedConversation';

export const getPersistedConversation = async ({
  conversationsDataClient,
  conversationId,
  logger,
  state,
}: GetPersistedConversationParams) => {
  logger.debug(`Node state:\n ${JSON.stringify(state, null, 2)}`);
  if (!conversationId) {
    logger.debug('Cannot get conversation, because conversationId is undefined');
    return {
      ...state,
      conversation: undefined,
      messages: [],
      chatTitle: '',
      input: state.input,
    };
  }

  const conversation = await conversationsDataClient?.getConversation({ id: conversationId });
  if (!conversation) {
    logger.debug('Requested conversation, because conversation is undefined');
    return {
      ...state,
      conversation: undefined,
      messages: [],
      chatTitle: '',
      input: state.input,
    };
  }

  logger.debug(`conversationId: ${conversationId}`);

  const messages = getLangChainMessages(conversation.messages ?? []);
  return {
    ...state,
    conversation,
    messages,
    chatTitle: conversation.title,
    input: !state.input ? conversation.messages?.slice(-1)[0].content : state.input,
  };
};
