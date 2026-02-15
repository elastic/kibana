/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import type { LlmProxy, LLmError } from '@kbn/ftr-llm-proxy';
import { createToolCallMessage } from '../llm_proxy';

const getToolChoiceFunctionName = (toolChoice: unknown): string | undefined => {
  if (!toolChoice || typeof toolChoice !== 'object') return undefined;
  const maybe = toolChoice as { function?: { name?: unknown } };
  return typeof maybe.function?.name === 'string' ? maybe.function.name : undefined;
};

export const mockTitleGeneration = (llmProxy: LlmProxy, title: string) => {
  // Title generation is implemented via structured output (a tool call named "set_title").
  // Different model adapters may shape `tool_choice` differently, so match the request via
  // either the tool choice name or the stable system prompt text.
  void llmProxy
    .intercept({
      name: 'set_title',
      when: (body) => {
        const systemMessage = body.messages.find((m) => m.role === 'system');
        const systemText = String(systemMessage?.content ?? '');
        return (
          getToolChoiceFunctionName(body.tool_choice) === 'set_title' ||
          systemText.includes('You are a title-generation utility')
        );
      },
      responseMock: createToolCallMessage('set_title', { title }),
    })
    .completeAfterIntercept();
};

export const mockTitleGenerationWithError = (llmProxy: LlmProxy, error: LLmError) => {
  void llmProxy
    .intercept({
      name: 'set_title',
      when: (body) => {
        const systemMessage = body.messages.find((m) => m.role === 'system');
        const systemText = String(systemMessage?.content ?? '');
        return (
          getToolChoiceFunctionName(body.tool_choice) === 'set_title' ||
          systemText.includes('You are a title-generation utility')
        );
      },
      responseMock: error,
    })
    .completeAfterIntercept();
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
    // Avoid accidentally intercepting title generation (it also ends with a user message).
    when: ({ messages }) => {
      const systemMessage = messages.find((message) => message.role === 'system');
      const systemText = String(systemMessage?.content ?? '');
      return !systemText.includes('You are a title-generation utility');
    },
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
