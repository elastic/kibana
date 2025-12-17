/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { OneChatApiFtrProviderContext } from '../../../onechat/services/api';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import { setupAgentDirectAnswer } from '../../utils/proxy_scenario';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createOneChatApiClient } from '../../utils/one_chat_client';

export default function ({ getService }: OneChatApiFtrProviderContext) {
  const supertest = getService('supertest');

  const log = getService('log');
  const oneChatApiClient = createOneChatApiClient(supertest);

  const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
  const MOCKED_LLM_TITLE = 'Mocked Conversation Title';

  describe('POST /api/agent_builder/converse: attachments', function () {
    let llmProxy: LlmProxy;
    let connectorId: string;

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
    });

    afterEach(() => {
      llmProxy?.clear();
    });

    after(async () => {
      llmProxy.close();
      await deleteActionConnector(getService, { actionId: connectorId });
    });

    it('returns an error when the attachment type is unknown', async () => {
      const body: any = await oneChatApiClient.converse({
        input: 'Hello OneChat',
        attachments: [
          {
            type: 'unknown',
            data: { foo: 'bar' },
          },
        ],
        connector_id: connectorId,
      });

      expect(body.statusCode).to.eql(400);
      expect(body.message).to.contain('Unknown attachment type');
    });

    it('returns an error when the attachment validation fails', async () => {
      const body: any = await oneChatApiClient.converse({
        input: 'Hello OneChat',
        attachments: [
          {
            type: 'text',
            data: {},
          },
        ],
        connector_id: connectorId,
      });

      expect(body.statusCode).to.eql(400);
      expect(body.message).to.contain('Attachment validation failed');
    });

    it('calls the LLM with the attachment', async () => {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_LLM_TITLE,
        response: MOCKED_LLM_RESPONSE,
      });

      await oneChatApiClient.converse({
        input: 'Hello OneChat',
        attachments: [
          {
            type: 'text',
            data: {
              content: 'some text content',
            },
          },
        ],
        connector_id: connectorId,
      });

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const firstAgentRequest = llmProxy.interceptedRequests.find(
        (request) => request.matchingInterceptorName === 'handover-to-answer'
      )!.requestBody;

      const userMessage = firstAgentRequest.messages[firstAgentRequest.messages.length - 1];

      expect(userMessage.content).to.contain('some text content');
    });

    it('persists the attachment in the conversation', async () => {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_LLM_TITLE,
        response: MOCKED_LLM_RESPONSE,
      });

      const response = await oneChatApiClient.converse({
        input: 'Hello OneChat',
        attachments: [
          {
            type: 'text',
            data: {
              content: 'some text content',
            },
          },
        ],
        connector_id: connectorId,
      });

      const conversation = await oneChatApiClient.getConversation(response.conversation_id);

      expect(conversation.rounds.length).to.eql(1);
      expect(conversation.rounds[0].input.attachments!.length).to.eql(1);

      const attachment = conversation.rounds[0].input.attachments![0];

      expect(attachment.type).to.eql('text');
      expect(attachment.data).to.eql({
        content: 'some text content',
      });
    });
  });
}
