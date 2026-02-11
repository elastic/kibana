/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Payload } from '@hapi/boom';
import type { ChatResponse } from '@kbn/agent-builder-plugin/common/http_api/chat';
import type { AgentBuilderApiFtrProviderContext } from '../../../agent_builder/services/api';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import { setupAgentDirectAnswer } from '../../utils/proxy_scenario';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient, type ExecutionMode } from '../../utils/agent_builder_client';

export function createSimpleConversationTests(executionMode: ExecutionMode) {
  return function ({ getService }: AgentBuilderApiFtrProviderContext) {
    const supertest = getService('supertest');

    const log = getService('log');
    const agentBuilderApiClient = createAgentBuilderApiClient(supertest, { executionMode });

    describe(`[${executionMode}] simple conversation`, function () {
      let llmProxy: LlmProxy;
      let connectorId: string;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
      });

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });
      });

      describe('when the payload is valid', () => {
        const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
        const MOCKED_LLM_TITLE = 'Mocked Conversation Title';
        let body: ChatResponse;

        before(async () => {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: MOCKED_LLM_TITLE,
            response: MOCKED_LLM_RESPONSE,
          });

          body = await agentBuilderApiClient.converse({
            input: 'Hello AgentBuilder',
            connector_id: connectorId,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        });

        it('returns the response from the LLM', async () => {
          expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);
        });

        it('persists the conversation with a title', async () => {
          const conversation = await agentBuilderApiClient.getConversation(body.conversation_id);
          expect(conversation.title).to.eql(MOCKED_LLM_TITLE);
        });

        it('persists the final LLM response in the conversation', async () => {
          const conversation = await agentBuilderApiClient.getConversation(body.conversation_id);
          expect(conversation.rounds[0].response.message).to.eql(MOCKED_LLM_RESPONSE);
        });
      });

      describe('Error cases', () => {
        it('returns 400 when payload is invalid', async () => {
          const res = (await agentBuilderApiClient.converse({} as any)) as unknown as Payload;

          expect(res.error).to.eql('Bad Request');
        });
      });
    });
  };
}
