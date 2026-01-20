/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import type { LlmProxy, LLmError } from '@kbn/ftr-llm-proxy';
import { createToolCallMessage } from '../llm_proxy';

export const mockTitleGeneration = (llmProxy: LlmProxy, title: string) => {
  void llmProxy.interceptors.toolChoice({
    name: 'set_title',
    response: createToolCallMessage('set_title', { title }),
  });
};

export const mockTitleGenerationWithError = (llmProxy: LlmProxy, error: LLmError) => {
  void llmProxy.interceptors.toolChoice({
    name: 'set_title',
    response: error,
  });
};

export const mockAgentToolCall = ({
  name = 'agent:tool_call',
  llmProxy,
  toolName,
  toolArg,
}: {
  name?: string;
  llmProxy: LlmProxy;
  toolName: string;
  toolArg: Record<string, any>;
}) => {
  void llmProxy.interceptors.userMessage({
    name,
    // when: ({ messages }) => {
    //   const lastMessage = last(messages)?.content as string;
    //   return lastMessage.includes(options.userPrompt);
    // },
    response: createToolCallMessage(toolName, toolArg),
  });
};

export const mockHandoverToAnswer = (llmProxy: LlmProxy, answer: string | LLmError) => {
  void llmProxy
    .intercept({
      name: 'handover-to-answer',
      when: ({ messages }) => {
        const systemMessage = messages.find((message) => message.role === 'system');
        return (systemMessage?.content as string).includes(
          'This response will serve as a handover note for the answering agent'
        );
      },
      responseMock: answer,
    })
    .completeAfterIntercept();
};

export const mockFinalAnswer = (llmProxy: LlmProxy, answer: string) => {
  void llmProxy
    .intercept({
      name: 'final-assistant-response',
      when: (body) => {
        return true;
      },
      responseMock: answer,
    })
    .completeAfterIntercept();
};

export const mockInternalIndexExplorerCall = ({
  resource,
  llmProxy,
}: {
  resource: { name: string; type: 'index' | 'data_stream' } | null;
  llmProxy: LlmProxy;
}) => {
  // search tool - index explorer call
  void llmProxy.interceptors.toolChoice({
    name: 'select_resources',
    response: createToolCallMessage('select_resources', {
      targets: resource
        ? [
            {
              reason: 'Because',
              type: resource.type,
              name: resource.name,
            },
          ]
        : [],
    }),
  });
};

export const mockSearchToolCallWithNaturalLanguageGen = ({
  resource,
  esqlQuery = "FROM my_index WHERE name = 'John'",
  llmProxy,
}: {
  resource: { name: string; type: 'index' | 'data_stream' };
  esqlQuery?: string;
  llmProxy: LlmProxy;
}) => {
  // search tool - index explorer call
  mockInternalIndexExplorerCall({ llmProxy, resource });

  // search tool - search strategy selection
  void llmProxy.interceptors.userMessage({
    name: 'search_tool:tool_selection',
    when: ({ messages }) => {
      const lastMessage = last(messages)?.content as string;
      return lastMessage.startsWith('Execute the following user query:');
    },
    response: createToolCallMessage('natural_language_search', {
      query: 'service.name:java-backend',
      index: resource.name,
    }),
  });

  // search tool - nl-to-esql call
  mockNlToEsql({ esqlQuery, llmProxy });
};

export const mockNlToEsql = ({
  esqlQuery = "FROM my_index WHERE name = 'John'",
  llmProxy,
}: {
  esqlQuery?: string;
  llmProxy: LlmProxy;
}) => {
  // generate esql - request documentation call
  void llmProxy.interceptors.toolChoice({
    name: 'request_documentation',
    response: createToolCallMessage('request_documentation', {
      commands: ['WHERE'],
      functions: [],
    }),
  });

  // generate esql - generate query call
  void llmProxy.interceptors.toolMessage({
    name: 'generate_esql:generate_query',
    when: ({ messages }) => {
      const systemMessage = messages.find((message) => message.role === 'system');
      return (systemMessage?.content as string).includes(
        `respond to the user's question by providing a valid ES|QL query`
      );
    },
    response: `Here's the ES|QL query:\`\`\`esql${esqlQuery}\`\`\``,
  });
};
