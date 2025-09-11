/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Payload } from '@hapi/boom';
import type { ChatResponse } from '@kbn/onechat-plugin/common/http_api/chat';
import { createLlmProxy, type LlmProxy } from '../../utils/create_llm_proxy';
import { createProxyActionConnector } from '../../utils/create_proxy_action_connector';
import { createOneChatApiClient } from '../../utils/http_client';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

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

    describe('simple conversation', () => {
      const MockedLLMResponse = 'Mocked LLM response';
      const MockedLLMTitle = 'Mocked Conversation Title';
      let body: ChatResponse;

      beforeEach(async () => {
        proxy.interceptToolChoice({
          name: 'set_title',
          arguments: () => JSON.stringify({ title: MockedLLMTitle }),
        });

        proxy.interceptUserMessage(MockedLLMResponse);

        body = await oneChatApiClient.converse({
          input: 'Hello OneChat',
          connector_id: connectorId,
        });

        await proxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      it('returns the response from the LLM', async () => {
        expect(body.response.message).to.eql(MockedLLMResponse);
      });

      it('persists the conversation with a title', async () => {
        const conversation = await oneChatApiClient.getConversation(body.conversation_id);
        expect(conversation.title).to.eql(MockedLLMTitle);
      });
    });

    it('returns 400 when payload is invalid', async () => {
      const res = (await oneChatApiClient.converse({} as any)) as unknown as Payload;

      expect(res.error).to.eql('Bad Request');
    });
  });
}
