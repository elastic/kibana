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

  describe('POST /api/chat/converse', function () {
    let llmProxy: LlmProxy;
    let connectorId: string;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    beforeEach(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await generateApmData(apmSynthtraceEsClient);
    });

    afterEach(async () => {
      llmProxy.close();
      await deleteActionConnector(getService, { actionId: connectorId });
      await apmSynthtraceEsClient.clean();
    });

    describe('tool: esql', () => {
      const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
      const MOCKED_LLM_TITLE = 'Mocked Conversation Title';
      const USER_PROMPT = 'Please find a single trace with `service.name:java-backend`';

      let body: ChatResponse;

      beforeEach(async () => {
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

        //
        void llmProxy.interceptors.toolChoice({
          name: 'select_resources',
          response: toolCallMock('select_resources', {
            targets: [
              {
                reason:
                  "The query 'service.name:java-backend' suggests a search related to APM (Application Performance Monitoring) data, which typically includes traces and metrics for services. The data stream 'traces-apm-default' is likely to contain relevant trace data for the 'java-backend'.",
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

        const productDocsToolCall = toolCallMock('structuredOutput', { commands: ['WHERE'] });
        void void llmProxy.interceptors.toolChoice({
          name: 'structuredOutput',
          response: productDocsToolCall,
        });

        void llmProxy.interceptors.toolMessage({
          when: ({ messages }) => {
            const lastMessage = last(messages);
            const contentParsed = JSON.parse(lastMessage?.content as string);
            return contentParsed?.documentation;
          },
          response: `To filter the data stream \`traces-apm-default\` for entries where \`service.name\` is equal to "product-service", you can use the \`WHERE\` command. Here's the ES|QL query:

\`\`\`esql
FROM traces-apm-default
| WHERE service.name == "product-service"
| LIMIT 100
\`\`\`

I've added a \`LIMIT 100\` for safety, as per the directives. If you need more results, please let me know!`,
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
      });

      it('returns the response from the LLM', async () => {
        expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);
      });

      // it('persists the conversation with a title', async () => {
      //   const conversation = await oneChatApiClient.getConversation(body.conversation_id);
      //   expect(conversation.title).to.eql(MOCKED_LLM_TITLE);
      // });
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
