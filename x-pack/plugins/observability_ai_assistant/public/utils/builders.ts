/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, uniqueId } from 'lodash';
import { MessageRole, Conversation, FunctionDefinition } from '../../common/types';
import { ChatTimelineItem } from '../components/chat/chat_timeline';
import { getAssistantSetupMessage } from '../service/get_assistant_setup_message';

type ChatItemBuildProps = Omit<Partial<ChatTimelineItem>, 'actions' | 'display' | 'currentUser'> & {
  actions?: Partial<ChatTimelineItem['actions']>;
  display?: Partial<ChatTimelineItem['display']>;
  currentUser?: Partial<ChatTimelineItem['currentUser']>;
} & Pick<ChatTimelineItem, 'role'>;

export function buildChatItem(params: ChatItemBuildProps): ChatTimelineItem {
  return merge(
    {
      id: uniqueId(),
      title: '',
      actions: {
        canCopy: true,
        canEdit: false,
        canGiveFeedback: false,
        canRegenerate: params.role === MessageRole.Assistant,
      },
      display: {
        collapsed: false,
        hide: false,
      },
      currentUser: {
        username: 'elastic',
      },
      loading: false,
    },
    params
  );
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
    actions: {
      canEdit: false,
      canCopy: true,
      canGiveFeedback: false,
      canRegenerate: false,
    },
  });
}

export function buildUserChatItem(params?: Omit<ChatItemBuildProps, 'role'>) {
  return buildChatItem({
    role: MessageRole.User,
    content: "What's a function?",
    actions: {
      canCopy: true,
      canEdit: true,
      canGiveFeedback: false,
      canRegenerate: true,
    },
    ...params,
  });
}

export function buildAssistantChatItem(params?: Omit<ChatItemBuildProps, 'role'>) {
  return buildChatItem({
    role: MessageRole.Assistant,
    content: `In computer programming and mathematics, a function is a fundamental concept that represents a relationship between input values and output values. It takes one or more input values (also known as arguments or parameters) and processes them to produce a result, which is the output of the function. The input values are passed to the function, and the function performs a specific set of operations or calculations on those inputs to produce the desired output.
    A function is often defined with a name, which serves as an identifier to call and use the function in the code. It can be thought of as a reusable block of code that can be executed whenever needed, and it helps in organizing code and making it more modular and maintainable.`,
    actions: {
      canCopy: true,
      canEdit: false,
      canRegenerate: true,
      canGiveFeedback: true,
    },
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
    messages: [getAssistantSetupMessage({ contexts: [] })],
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
      descriptionForUser: 'Call Elasticsearch APIs on behalf of the user',
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
      descriptionForUser: 'Get a summary for a single service.',
      parameters: {
        type: 'object',
      },
    },
    respond: async (options: { arguments: any }, signal: AbortSignal) => ({}),
  };
}
