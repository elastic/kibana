/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy, LLmError } from '@kbn/ftr-llm-proxy';
import {
  mockTitleGeneration,
  mockTitleGenerationWithError,
  mockHandoverToAnswer,
  mockFinalAnswer,
  mockAgentToolCall,
  mockSearchToolCallWithNaturalLanguageGen,
} from './calls';

/**
 * Simple request scenario - response with the given response directly
 */
export const setupAgentDirectAnswer = async ({
  response,
  proxy,
  title = 'New discussion',
  continueConversation = false,
}: {
  response: string;
  title?: string;
  proxy: LlmProxy;
  continueConversation?: boolean;
}) => {
  if (!continueConversation) {
    mockTitleGeneration(proxy, title);
  }
  mockHandoverToAnswer(proxy, 'ready to answer');
  mockFinalAnswer(proxy, response);
};

/**
 * Simple request scenario - response with the given response directly
 */
export const setupAgentDirectError = async ({
  error,
  titleError,
  proxy,
  continueConversation = false,
}: {
  error: LLmError;
  titleError?: LLmError;
  proxy: LlmProxy;
  continueConversation?: boolean;
}) => {
  if (!continueConversation) {
    mockTitleGenerationWithError(proxy, titleError ?? error);
  }
  mockHandoverToAnswer(proxy, error);
};

/**
 * Calls
 */
export const setupAgentCallSearchToolWithEsqlThenAnswer = async ({
  response,
  proxy,
  title = 'New discussion',
  esqlQuery = "FROM my_index WHERE name = 'John'",
  resourceName,
  resourceType,
}: {
  response: string;
  title?: string;
  esqlQuery?: string;
  resourceName: string;
  resourceType: 'index' | 'data_stream';
  proxy: LlmProxy;
}) => {
  mockTitleGeneration(proxy, title);

  mockAgentToolCall({
    llmProxy: proxy,
    toolName: 'platform_core_search',
    toolArg: {
      query: 'service.name:java-backend',
    },
  });

  mockSearchToolCallWithNaturalLanguageGen({
    llmProxy: proxy,
    esqlQuery,
    resource: { name: resourceName, type: resourceType },
  });

  mockHandoverToAnswer(proxy, 'ready to answer');

  mockFinalAnswer(proxy, response);
};

/**
 * Calls
 */
export const setupAgentCallSearchToolWithNoIndexSelectedThenAnswer = async ({
  response,
  proxy,
  title = 'New discussion',
}: {
  response: string;
  title?: string;
  proxy: LlmProxy;
}) => {
  mockTitleGeneration(proxy, title);

  mockAgentToolCall({
    llmProxy: proxy,
    toolName: 'platform_core_search',
    toolArg: {
      query: 'just a query',
    },
  });

  mockHandoverToAnswer(proxy, 'ready to answer');

  mockFinalAnswer(proxy, response);
};
