/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ConversationEvent } from '../../../common/conversation_events';
import { conversationEventsToMessages } from '../orchestration/utils';

export const generateConversationTitle = async ({
  conversationEvents,
  chatModel,
}: {
  conversationEvents: ConversationEvent[];
  chatModel: InferenceChatModel;
}) => {
  const structuredModel = chatModel.withStructuredOutput(
    z.object({
      title: z.string().describe('The title for the conversation'),
    })
  );

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      "'You are a helpful assistant. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below",
    ],
    ['placeholder', '{messages}'],
  ]);

  const messages = conversationEventsToMessages(conversationEvents);

  const chain = prompt.pipe(structuredModel);

  const { title } = await chain.invoke({ messages });

  return title;
};
