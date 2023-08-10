/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueId } from 'lodash';
import { MessageRole, Conversation, FunctionDefinition } from '../../common/types';
import { ChatTimelineItem } from '../components/chat/chat_timeline';
import { getSystemMessage } from '../service/get_system_message';

type ChatItemBuildProps = Partial<ChatTimelineItem> & Pick<ChatTimelineItem, 'role'>;

export function buildChatItem(params: ChatItemBuildProps): ChatTimelineItem {
  return {
    id: uniqueId(),
    title: '',
    canEdit: false,
    canGiveFeedback: false,
    canRegenerate: params.role === MessageRole.User,
    currentUser: {
      username: 'elastic',
    },
    loading: false,
    ...params,
  };
}

export function buildSystemChatItem(params?: Omit<ChatItemBuildProps, 'role'>) {
  return buildChatItem({
    role: MessageRole.System,
    ...params,
  });
}

export function buildChatInitItem() {
  return buildChatItem({
    role: MessageRole.User,
    title: 'started a conversation',
    canRegenerate: false,
  });
}

export function buildUserChatItem(params?: Omit<ChatItemBuildProps, 'role'>) {
  return buildChatItem({
    role: MessageRole.User,
    content: "What's a function?",
    canEdit: true,
    ...params,
  });
}

export function buildAssistantChatItem(params?: Omit<ChatItemBuildProps, 'role'>) {
  return buildChatItem({
    role: MessageRole.Assistant,
    content: `In computer programming and mathematics, a function is a fundamental concept that represents a relationship between input values and output values. It takes one or more input values (also known as arguments or parameters) and processes them to produce a result, which is the output of the function. The input values are passed to the function, and the function performs a specific set of operations or calculations on those inputs to produce the desired output.
    A function is often defined with a name, which serves as an identifier to call and use the function in the code. It can be thought of as a reusable block of code that can be executed whenever needed, and it helps in organizing code and making it more modular and maintainable.`,
    canRegenerate: true,
    canGiveFeedback: true,
    ...params,
  });
}

export function buildFunctionChatItem(params: Omit<ChatItemBuildProps, 'role'>) {
  return buildChatItem({
    role: MessageRole.User,
    title: 'executed a function',
    function_call: {
      name: 'leftpad',
      arguments: '{ foo: "bar" }',
      trigger: MessageRole.Assistant,
    },
    ...params,
  });
}

export function buildTimelineItems() {
  return {
    items: [buildSystemChatItem(), buildUserChatItem(), buildAssistantChatItem()],
  };
}

export function buildConversation(params?: Partial<Conversation>) {
  return {
    '@timestamp': '',
    user: {
      name: 'foo',
    },
    conversation: {
      id: uniqueId(),
      title: '',
      last_updated: '',
    },
    messages: [getSystemMessage()],
    labels: {},
    numeric_labels: {},
    namespace: '',
    ...params,
  };
}

export function buildFunction(): FunctionDefinition {
  return {
    options: {
      name: 'elasticsearch',
      contexts: ['core'],
      description: 'Call Elasticsearch APIs on behalf of the user',
      parameters: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Elasticsearch endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          path: {
            type: 'string',
            description: 'The path of the Elasticsearch endpoint, including query parameters',
          },
        },
        required: ['method' as const, 'path' as const],
      },
    },
    respond: async (options: { arguments: any }, signal: AbortSignal) => ({}),
  };
}

export const buildFunctionElasticsearch = buildFunction;

export function buildFunctionServiceSummary(): FunctionDefinition {
  return {
    options: {
      name: 'get_service_summary',
      contexts: ['core'],
      description:
        'Gets a summary of a single service, including: the language, service version, deployments, infrastructure, alerting, etc. ',
      parameters: {
        type: 'object',
      },
    },
    respond: async (options: { arguments: any }, signal: AbortSignal) => ({}),
  };
}
