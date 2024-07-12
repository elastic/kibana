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

export interface PersistConversationChangesParams extends NodeParamsBase {
  conversationsDataClient?: AIAssistantConversationsDataClient;
  conversationId?: string;
  state: AgentState;
  replacements?: Replacements;
}

export const PERSIST_CONVERSATION_CHANGES_NODE = 'persistConversationChanges';

export const persistConversationChanges = async ({
  conversationsDataClient,
  conversationId,
  logger,
  state,
  replacements = {},
}: PersistConversationChangesParams) => {
  logger.debug(`Node state:\n ${JSON.stringify(state, null, 2)}`);

  if (!state.conversation || !conversationId) {
    logger.debug('No need to generate chat title, conversationId is undefined');
    return {
      conversation: undefined,
      messages: [],
    };
  }

  let conversation;
  if (state.conversation?.title !== state.chatTitle) {
    conversation = await conversationsDataClient?.updateConversation({
      conversationUpdateProps: {
        id: conversationId,
        title: state.chatTitle,
      },
    });
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
    return { conversation: undefined, messages: [] };
  }

  logger.debug(`conversationId: ${conversationId}`);
  const langChainMessages = getLangChainMessages(updatedConversation.messages ?? []);
  const messages = langChainMessages.slice(0, -1); // all but the last message

  return {
    conversation: updatedConversation,
    messages,
  };
};
