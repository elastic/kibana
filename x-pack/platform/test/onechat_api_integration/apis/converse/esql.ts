/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ChatResponse } from '@kbn/onechat-plugin/common/http_api/chat';
import { last } from 'lodash';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import { createProxyActionConnector } from '../../utils/llm_proxy/create_proxy_action_connector';
import { createOneChatApiClient } from '../../utils/http_client';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { toolCallMock } from '../../utils/llm_proxy/mocks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const log = getService('log');
  const oneChatApiClient = createOneChatApiClient(supertest);

  describe('POST /api/chat/converse', function () {
    let proxy: LlmProxy;
    let connectorId: string;

    beforeEach(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector(getService, {
        port: proxy.getPort(),
      });
    });

    afterEach(() => {
      proxy.close();
    });

    describe('tool: esql', () => {
      const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
      const MOCKED_LLM_TITLE = 'Mocked Conversation Title';
      const USER_PROMPT = 'Please find a single trace with `transaction.name=GET /products`';

      let body: ChatResponse;

      beforeEach(async () => {
        // mock title
        proxy.interceptors.toolChoice({
          name: 'generate_conversation_title',
          response: toolCallMock('generate_conversation_title', { title: MOCKED_LLM_TITLE }),
        });

        // intercept the user message and respond with tool call to "platform_coresearch"
        proxy.interceptors.userMessage({
          when: ({ messages }) => {
            const lastMessage = last(messages)?.content as string;
            return lastMessage.includes(USER_PROMPT);
          },
          response: toolCallMock('platform_coresearch', {
            query: 'transaction.name:GET /products',
          }),
        });

        //
        proxy.interceptors.toolChoice({
          name: 'select_resources',
          response: toolCallMock('select_resources', {
            targets: [
              {
                reason:
                  'The query is looking for transaction data, and this data stream is likely to contain relevant transaction information, including transaction duration and metrics.',
                type: 'data_stream',
                name: 'metrics-apm.transaction.1m-default',
              },
            ],
          }),
        });

        proxy.interceptors.userMessage({
          when: ({ messages }) => {
            const lastMessage = last(messages)?.content as string;
            return lastMessage.startsWith('Execute the following user query:');
          },
          response: toolCallMock('natural_language_search', {
            query: 'transaction.name:GET /products',
            index: 'metrics-apm.transaction.1m-default',
          }),
        });

        body = await oneChatApiClient.converse({
          input: USER_PROMPT,
          connector_id: connectorId,
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
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
