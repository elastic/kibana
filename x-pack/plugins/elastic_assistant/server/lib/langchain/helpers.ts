/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/elastic-assistant';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';

export const getLangChainMessage = (assistantMessage: Message): BaseMessage => {
  switch (assistantMessage.role) {
    case 'system':
      return new SystemMessage(assistantMessage.content);
    case 'user':
      return new HumanMessage(assistantMessage.content);
    case 'assistant':
      return new AIMessage(assistantMessage.content);
    default:
      return new HumanMessage(assistantMessage.content);
  }
};

export const getLangChainMessages = (assistantMessages: Message[]): BaseMessage[] =>
  assistantMessages.map(getLangChainMessage);

export const getMessageContentAndRole = (prompt: string): Pick<Message, 'content' | 'role'> => ({
  content: prompt,
  role: 'user',
});

export interface ResponseBody {
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  connector_id: string;
}

/** An unsafe, temporary stub that parses assistant messages from the request with no validation */
export const unsafeGetAssistantMessagesFromRequest = (
  rawSubActionParamsBody: string | undefined
): Message[] => {
  try {
    if (rawSubActionParamsBody == null) {
      return [];
    }

    const subActionParamsBody = JSON.parse(rawSubActionParamsBody); // TODO: unsafe, no validation
    const messages = subActionParamsBody?.messages;

    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
};
