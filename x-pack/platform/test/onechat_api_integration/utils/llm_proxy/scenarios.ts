/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import type { LlmProxy } from '.';
import { toolCallMock } from './mocks';

export async function setupEsqlScenario(
  llmProxy: LlmProxy,
  log: ToolingLog,
  options: {
    userPrompt: string;
    title: string;
    finalLlmResponse: string;
    esqlQuery: string;
  }
) {
  try {
    return await Promise.all([
      // mock title
      llmProxy.interceptors.toolChoice({
        name: 'set_title',
        response: toolCallMock('set_title', { title: options.title }),
      }),

      // intercept the user message and respond with tool call to "platform_core_search"
      llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages)?.content as string;
          return lastMessage.includes(options.userPrompt);
        },
        response: toolCallMock('platform_core_search', {
          query: 'service.name:java-backend',
        }),
      }),

      llmProxy.interceptors.toolChoice({
        name: 'select_resources',
        response: toolCallMock('select_resources', {
          targets: [
            {
              reason: "The query 'service.name:java-backend' suggests a search related to APM data",
              type: 'data_stream',
              name: 'traces-apm-default',
            },
          ],
        }),
      }),

      llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages)?.content as string;
          return lastMessage.startsWith('Execute the following user query:');
        },
        response: toolCallMock('natural_language_search', {
          query: 'service.name:java-backend',
          index: 'metrics-apm.transaction.1m-default',
        }),
      }),

      llmProxy.interceptors.toolChoice({
        name: 'structuredOutput',
        response: toolCallMock('structuredOutput', { commands: ['WHERE'] }),
      }),

      llmProxy.interceptors.toolMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages);
          const contentParsed = JSON.parse(lastMessage?.content as string);
          return contentParsed?.documentation;
        },
        response: `Here's the ES|QL query:\`\`\`esql${options.esqlQuery}\`\`\``,
      }),

      void llmProxy.interceptors.toolMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages);
          const contentParsed = JSON.parse(lastMessage?.content as string);
          return contentParsed?.results;
        },
        response: options.finalLlmResponse,
      }),
    ]);
  } catch (e) {
    log.error(`One or more interceptors encountered an error in the ESQL scenario: ${e.message}`);
    throw e;
  }
}
