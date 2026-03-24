/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Payload } from '@hapi/boom';
import type { AgentBuilderApiFtrProviderContext } from '../../../agent_builder/services/api';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import { setupAgentDirectAnswer } from '../../utils/proxy_scenario';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient, type ExecutionMode } from '../../utils/agent_builder_client';

export function createRegenerateTests(executionMode: ExecutionMode) {
  return function ({ getService }: AgentBuilderApiFtrProviderContext) {
    const supertest = getService('supertest');

    const log = getService('log');
    const agentBuilderApiClient = createAgentBuilderApiClient(supertest, { executionMode });

    describe(`[${executionMode}] action=regenerate`, function () {
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

      describe('when action=regenerate', () => {
        const MOCKED_LLM_RESPONSE_1 = 'Original Response';
        const MOCKED_LLM_RESPONSE_2 = 'Regenerated Response';
        const MOCKED_LLM_TITLE = 'Test Conversation';

        it('regenerates the last round using its original input', async () => {
          // First round: create conversation
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: MOCKED_LLM_TITLE,
            response: MOCKED_LLM_RESPONSE_1,
          });

          const firstResponse = await agentBuilderApiClient.converse({
            input: 'Original user message',
            connector_id: connectorId,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const conversationId = firstResponse.conversation_id;

          // Verify initial state
          let conversation = await agentBuilderApiClient.getConversation(conversationId);
          expect(conversation.rounds.length).to.eql(1);
          expect(conversation.rounds[0].response.message).to.eql(MOCKED_LLM_RESPONSE_1);
          expect(conversation.rounds[0].input.message).to.eql('Original user message');

          // Regenerate the last round
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: MOCKED_LLM_RESPONSE_2,
          });

          const regenerateResponse = await agentBuilderApiClient.converse({
            conversation_id: conversationId,
            connector_id: connectorId,
            action: 'regenerate',
            // This input should be ignored - the original input should be used
            input: 'This should be ignored',
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          // Verify regenerate response
          expect(regenerateResponse.response.message).to.eql(MOCKED_LLM_RESPONSE_2);

          // Verify the conversation still has only 1 round (replaced, not appended)
          conversation = await agentBuilderApiClient.getConversation(conversationId);
          expect(conversation.rounds.length).to.eql(1);
          expect(conversation.rounds[0].response.message).to.eql(MOCKED_LLM_RESPONSE_2);
          // The input should still be the original message
          expect(conversation.rounds[0].input.message).to.eql('Original user message');
        });

        it('preserves previous rounds when regenerating the last round of multi-round conversation', async () => {
          const RESPONSE_1 = 'First response';
          const RESPONSE_2 = 'Second response';
          const RESPONSE_2_REGENERATED = 'Second response regenerated';

          // Round 1
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: MOCKED_LLM_TITLE,
            response: RESPONSE_1,
          });

          const round1Response = await agentBuilderApiClient.converse({
            input: 'First message',
            connector_id: connectorId,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
          const conversationId = round1Response.conversation_id;

          // Round 2
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: RESPONSE_2,
          });

          await agentBuilderApiClient.converse({
            conversation_id: conversationId,
            connector_id: connectorId,
            input: 'Second message',
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          // Verify we have 2 rounds
          let conversation = await agentBuilderApiClient.getConversation(conversationId);
          expect(conversation.rounds.length).to.eql(2);

          // Regenerate the last round
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: RESPONSE_2_REGENERATED,
          });

          await agentBuilderApiClient.converse({
            conversation_id: conversationId,
            connector_id: connectorId,
            action: 'regenerate',
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          // Verify still 2 rounds, with last round regenerated
          conversation = await agentBuilderApiClient.getConversation(conversationId);
          expect(conversation.rounds.length).to.eql(2);
          expect(conversation.rounds[0].response.message).to.eql(RESPONSE_1);
          expect(conversation.rounds[0].input.message).to.eql('First message');
          expect(conversation.rounds[1].response.message).to.eql(RESPONSE_2_REGENERATED);
          expect(conversation.rounds[1].input.message).to.eql('Second message');
        });
      });

      describe('error cases', () => {
        it('returns 400 when action=regenerate but no conversation_id is provided', async () => {
          const res = (await agentBuilderApiClient.converse({
            connector_id: connectorId,
            action: 'regenerate',
          })) as unknown as Payload;

          expect(res.statusCode).to.eql(400);
          expect(res.message).to.contain('conversation_id is required when action is regenerate');
        });
      });
    });
  };
}
