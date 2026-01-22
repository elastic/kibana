/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { AgentBuilderApiFtrProviderContext } from '../../../agent_builder/services/api';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import { setupAgentDirectAnswer } from '../../utils/proxy_scenario';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient } from '../../utils/agent_builder_client';

export default function ({ getService }: AgentBuilderApiFtrProviderContext) {
  const supertest = getService('supertest');

  const log = getService('log');
  const agentBuilderApiClient = createAgentBuilderApiClient(supertest);

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
      const body: any = await agentBuilderApiClient.converse({
        input: 'Hello AgentBuilder',
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
      const body: any = await agentBuilderApiClient.converse({
        input: 'Hello AgentBuilder',
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

      await agentBuilderApiClient.converse({
        input: 'Hello AgentBuilder',
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

      // Attachments are now injected into the LLM context via conversation-level attachments presentation,
      // not as legacy per-round user message attachments.
      const allMessageContent = firstAgentRequest.messages
        .map((m: any) => String(m.content ?? ''))
        .join('\n');
      expect(allMessageContent).to.contain('some text content');
    });

    it('persists the attachment in the conversation', async () => {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_LLM_TITLE,
        response: MOCKED_LLM_RESPONSE,
      });

      const response = await agentBuilderApiClient.converse({
        input: 'Hello AgentBuilder',
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

      const conversation = await agentBuilderApiClient.getConversation(response.conversation_id);

      expect(conversation.rounds.length).to.eql(1);
      // Legacy per-round attachments are stripped; attachments are stored at the conversation level.
      expect(conversation.rounds[0].input.attachments ?? []).to.eql([]);

      expect(conversation.attachments).to.have.length(1);
      expect(conversation.attachments?.[0].type).to.eql('text');
      expect(conversation.attachments?.[0].current_version).to.eql(1);
      expect(conversation.attachments?.[0].versions[0].data).to.eql({
        content: 'some text content',
      });
    });
  });
}
