/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '../llm_proxy';
import {
  mockTitleGeneration,
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
}: {
  response: string;
  title?: string;
  proxy: LlmProxy;
}) => {
  mockTitleGeneration(proxy, title);
  mockFinalAnswer(proxy, response);
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

  // no index present -> won't run index explorer
  // mockInternalIndexExplorerCall({ llmProxy: proxy, resource: null });

  mockFinalAnswer(proxy, response);
};
