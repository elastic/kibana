/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import type { Message } from '@kbn/elastic-assistant';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/actions_connector/post_actions_connector_execute_route.gen';

export const getLangChainMessage = (
  assistantMessage: Pick<Message, 'content' | 'role'>
): BaseMessage => {
  switch (assistantMessage.role) {
    case 'system':
      return new SystemMessage(assistantMessage.content ?? '');
    case 'user':
      return new HumanMessage(assistantMessage.content ?? '');
    case 'assistant':
      return new AIMessage(assistantMessage.content ?? '');
    default:
      return new HumanMessage(assistantMessage.content ?? '');
  }
};

export const getLangChainMessages = (
  assistantMessages: Array<Pick<Message, 'content' | 'role'>>
): BaseMessage[] => assistantMessages.map(getLangChainMessage);

export const getMessageContentAndRole = (prompt: string): Pick<Message, 'content' | 'role'> => ({
  content: prompt,
  role: 'user',
});

export const requestHasRequiredAnonymizationParams = (
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>
): boolean => {
  const { allow, allowReplacement, replacements } = request?.body ?? {};

  const allowIsValid =
    Array.isArray(allow) &&
    allow.length > 0 && // at least one field must be in the allow list
    allow.every((item) => typeof item === 'string');

  const allowReplacementIsValid =
    Array.isArray(allowReplacement) && allowReplacement.every((item) => typeof item === 'string');

  const replacementsIsValid =
    typeof replacements === 'object' &&
    Object.keys(replacements).every(
      (key) => typeof key === 'string' && typeof replacements[key] === 'string'
    );

  return allowIsValid && allowReplacementIsValid && replacementsIsValid;
};
