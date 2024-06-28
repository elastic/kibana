/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StringOutputParser } from '@langchain/core/output_parsers';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentState, NodeParamsBase } from '../types';
import { AIAssistantConversationsDataClient } from '../../../../../ai_assistant_data_clients/conversations';

export const GENERATE_CHAT_TITLE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant for Elastic Security. Assume the following user message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. As an example, for the given MESSAGE, this is the TITLE:

    MESSAGE: I am having trouble with the Elastic Security app.
    TITLE: Troubleshooting Elastic Security app issues
    `,
  ],
  ['human', '{input}'],
]);

export interface GenerateChatTitleParams extends NodeParamsBase {
  conversationsDataClient?: AIAssistantConversationsDataClient;
  conversationId?: string;
  state: AgentState;
}

export const GENERATE_CHAT_TITLE_NODE = 'generateChatTitle';

export const generateChatTitle = async ({
  conversationsDataClient,
  logger,
  model,
  state,
}: GenerateChatTitleParams) => {
  logger.debug(`Node state:\n ${JSON.stringify(state, null, 2)}`);
  if (state.messages.length !== 0) {
    logger.debug('No need to generate chat title, messages already exist');
    return;
  }
  const outputParser = new StringOutputParser();
  const graph = GENERATE_CHAT_TITLE_PROMPT.pipe(model).pipe(outputParser);

  const chatTitle = await graph.invoke({
    input: JSON.stringify(state.input, null, 2),
  });

  logger.debug(`chatTitle: ${chatTitle}`);

  return {
    chatTitle,
  };
};
