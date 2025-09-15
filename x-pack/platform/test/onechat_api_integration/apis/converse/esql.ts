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
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createOneChatApiClient } from '../../utils/one_chat_client';
import { toolCallMock } from '../../utils/llm_proxy/mocks';
import type { OneChatFtrProviderContext } from '../../configs/ftr_provider_context';

export default function ({ getService }: OneChatFtrProviderContext) {
  const supertest = getService('supertest');

  const log = getService('log');
  const synthtrace = getService('synthtrace');
  const oneChatApiClient = createOneChatApiClient(supertest);

  describe('converse API: tool calling', () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let queryResult: QueryResult;
    let tabularDataResult: TabularDataResult;

    const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
    const MOCKED_LLM_TITLE = 'Mocked Conversation Title';
    const USER_PROMPT = 'Please find a single trace with `service.name:java-backend`';
    const MOCKED_ESQL_QUERY =
      'FROM traces-apm-default\n| WHERE service.name == "java-backend"\n| LIMIT 100';

    let body: ChatResponse;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await generateApmData(apmSynthtraceEsClient);

      // mock title
      void llmProxy.interceptors.toolChoice({
        name: 'set_title',
        response: toolCallMock('set_title', { title: MOCKED_LLM_TITLE }),
      });

      // intercept the user message and respond with tool call to "platform_core_search"
      void llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages)?.content as string;
          return lastMessage.includes(USER_PROMPT);
        },
        response: toolCallMock('platform_core_search', {
          query: 'service.name:java-backend',
        }),
      });

      void llmProxy.interceptors.toolChoice({
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
      });

      void llmProxy.interceptors.userMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages)?.content as string;
          return lastMessage.startsWith('Execute the following user query:');
        },
        response: toolCallMock('natural_language_search', {
          query: 'service.name:java-backend',
          index: 'metrics-apm.transaction.1m-default',
        }),
      });

      void void llmProxy.interceptors.toolChoice({
        name: 'structuredOutput',
        response: toolCallMock('structuredOutput', { commands: ['WHERE'] }),
      });

      void llmProxy.interceptors.toolMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages);
          const contentParsed = JSON.parse(lastMessage?.content as string);
          return contentParsed?.documentation;
        },
        response: `Here's the ES|QL query:\`\`\`esql${MOCKED_ESQL_QUERY}\`\`\``,
      });

      void llmProxy.interceptors.toolMessage({
        when: ({ messages }) => {
          const lastMessage = last(messages);
          const contentParsed = JSON.parse(lastMessage?.content as string);
          return contentParsed?.results;
        },
        response: MOCKED_LLM_RESPONSE,
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

    it.only('sends the correct esql query to the LLM', () => {
      expect(queryResult.type).to.be('query');
      // @ts-expect-error
      expect(queryResult.data.esql).to.be(MOCKED_ESQL_QUERY);
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
