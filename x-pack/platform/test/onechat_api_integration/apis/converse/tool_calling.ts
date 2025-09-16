/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ChatResponse } from '@kbn/onechat-plugin/common/http_api/chat';
import { last } from 'lodash';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { QueryResult, TabularDataResult } from '@kbn/onechat-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createOneChatApiClient } from '../../utils/one_chat_client';
import type { OneChatFtrProviderContext } from '../../configs/ftr_provider_context';
import { toolCallMock } from '../../utils/llm_proxy/mocks';

export default function ({ getService }: OneChatFtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const synthtrace = getService('synthtrace');
  const oneChatApiClient = createOneChatApiClient(supertest);

  describe('POST /api/agent_builder/converse: tool calling', () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let queryResult: QueryResult;
    let tabularDataResult: TabularDataResult;

    const USER_PROMPT = 'Please find a single trace with `service.name:java-backend`';
    const MOCKED_LLM_TITLE = 'Mocked conversation title';
    const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
    const MOCKED_ESQL_QUERY =
      'FROM traces-apm-default\n| WHERE service.name == "java-backend"\n| LIMIT 100';

    let body: ChatResponse;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await generateApmData(apmSynthtraceEsClient);

      void setupInterceptors(llmProxy, log, {
        userPrompt: USER_PROMPT,
        title: MOCKED_LLM_TITLE,
        finalLlmResponse: MOCKED_LLM_RESPONSE,
        esqlQuery: MOCKED_ESQL_QUERY,
      });

      body = await oneChatApiClient.converse({
        input: USER_PROMPT,
        connector_id: connectorId,
      });

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const lastMessage = last(last(llmProxy.interceptedRequests)?.requestBody.messages);
      const lastMessageParsed = JSON.parse(lastMessage?.content as string);
      expect(lastMessage?.role).to.eql('tool');

      [queryResult, tabularDataResult] = lastMessageParsed.results as [
        QueryResult,
        TabularDataResult
      ];
    });

    after(async () => {
      llmProxy.close();
      await deleteActionConnector(getService, { actionId: connectorId });
      await apmSynthtraceEsClient.clean();
    });

    it('sends the correct esql query to the LLM', () => {
      expect(queryResult.type).to.be('query');
      expect('esql' in queryResult.data ? queryResult.data.esql : '').to.be(MOCKED_ESQL_QUERY);
    });

    it('sends the correct esql result to the LLM', () => {
      expect(tabularDataResult.type).to.be('tabular_data');
      expect(tabularDataResult).have.property('tool_result_id');
      expect(tabularDataResult.data.source).to.be('esql');
      expect(tabularDataResult.data.query).to.be(MOCKED_ESQL_QUERY);
      expect(tabularDataResult.data.values).to.have.length(15);
    });

    it('returns the response from the LLM', async () => {
      expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);
    });
  });
}

async function generateApmData(apmSynthtraceEsClient: ApmSynthtraceEsClient) {
  const myService = apm
    .service({ name: 'java-backend', environment: 'production', agentName: 'java' })
    .instance('my-instance');

  const events = timerange('now-15m', 'now')
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return [
        myService
          .transaction({ transactionName: 'GET /user/123' })
          .timestamp(timestamp)
          .duration(1000),
      ];
    });

  return apmSynthtraceEsClient.index(events);
}

async function setupInterceptors(
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
