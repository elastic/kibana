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
import { createAgentBuilderApiClient, type ExecutionMode } from '../../utils/agent_builder_client';

export function createMultiRoundsTests(executionMode: ExecutionMode) {
  return function ({ getService }: AgentBuilderApiFtrProviderContext) {
    const supertest = getService('supertest');

    const log = getService('log');
    const agentBuilderApiClient = createAgentBuilderApiClient(supertest, { executionMode });

    describe(`[${executionMode}] multi rounds`, function () {
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

      const MOCKED_LLM_RESPONSE_1 = 'Response 1';
      const MOCKED_LLM_RESPONSE_2 = 'Response 2';
      const MOCKED_LLM_TITLE = 'Mocked Conversation Title';

      it('handles a simple multi-round conversation', async () => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_LLM_TITLE,
          response: MOCKED_LLM_RESPONSE_1,
        });

        const firstResponse = await agentBuilderApiClient.converse({
          input: 'Hello AgentBuilder',
          connector_id: connectorId,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversationId = firstResponse.conversation_id;

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: MOCKED_LLM_RESPONSE_2,
        });

        const secondResponse = await agentBuilderApiClient.converse({
          input: 'Follow up',
          conversation_id: conversationId,
          connector_id: connectorId,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(secondResponse.response.message).to.eql(MOCKED_LLM_RESPONSE_2);

        const conversation = await agentBuilderApiClient.getConversation(conversationId);

        expect(conversation.rounds.length).to.eql(2);
        expect(conversation.rounds[0].response.message).to.eql(MOCKED_LLM_RESPONSE_1);
        expect(conversation.rounds[1].response.message).to.eql(MOCKED_LLM_RESPONSE_2);
      });
    });
  };
}
