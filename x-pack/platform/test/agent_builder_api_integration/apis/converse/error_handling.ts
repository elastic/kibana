/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  mockTitleGeneration,
  mockHandoverToAnswer,
  mockFinalAnswer,
  mockAgentToolCall,
} from '../../utils/proxy_scenario/calls';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient, type ExecutionMode } from '../../utils/agent_builder_client';
import type { AgentBuilderApiFtrProviderContext } from '../../../agent_builder/services/api';

export function createErrorHandlingTests(executionMode: ExecutionMode) {
  return function ({ getService }: AgentBuilderApiFtrProviderContext) {
    const supertest = getService('supertest');
    const log = getService('log');
    const agentBuilderApiClient = createAgentBuilderApiClient(supertest, { executionMode });

    describe(`[${executionMode}] error handling`, () => {
      let llmProxy: LlmProxy;
      let connectorId: string;

      const USER_PROMPT = 'Please do something';
      const MOCKED_LLM_TITLE = 'Mocked conversation title';
      const MOCKED_LLM_RESPONSE = 'Mocked LLM response';

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
      });

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });
      });

      it('recovers and calls the LLM again when the answer agent tries calling a tool', async () => {
        await setupAnswerAgentCallsInvalidTool({
          proxy: llmProxy,
          title: MOCKED_LLM_TITLE,
          response: MOCKED_LLM_RESPONSE,
        });

        const body = await agentBuilderApiClient.converse({
          input: USER_PROMPT,
          connector_id: connectorId,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);

        const retryRequest = llmProxy.interceptedRequests.find(
          (request) => request.matchingInterceptorName === 'final-assistant-response'
        )?.requestBody;

        expect(retryRequest).to.not.be(undefined);

        const messages = (retryRequest as { messages: Array<{ role?: string; content?: unknown }> })
          .messages;

        // The retry request includes a mix of human/assistant/tool messages.
        // We want the tool-result message that carries the "tool not available" error.
        const lastToolMessage = [...messages]
          .reverse()
          .find((m) => m?.role === 'tool' && typeof m?.content === 'string');

        expect(lastToolMessage).to.not.be(undefined);

        const toolContent = lastToolMessage!.content as string;
        let errorMessage = toolContent;
        // Some layers may wrap tool result content in a JSON string.
        try {
          const parsed = JSON.parse(toolContent) as { response?: unknown };
          if (parsed && typeof parsed === 'object' && typeof parsed.response === 'string') {
            errorMessage = parsed.response;
          }
        } catch {
          // Non-JSON tool content; use as-is.
        }

        expect(errorMessage).to.contain('ERROR: called a tool which was not available');
      });
    });
  };
}

/**
 * Answer agent calls an invalid tool on first call and then responds on the second call
 */
export const setupAnswerAgentCallsInvalidTool = async ({
  response,
  proxy,
  title = 'New discussion',
  continueConversation = false,
}: {
  response: string;
  title?: string;
  proxy: LlmProxy;
  continueConversation?: boolean;
}) => {
  if (!continueConversation) {
    mockTitleGeneration(proxy, title);
  }

  // research agent handover to answer
  mockHandoverToAnswer(proxy, 'ready to answer');

  // answer tries to call a tool
  mockAgentToolCall({
    llmProxy: proxy,
    toolName: 'platform_core_search',
    toolArg: {
      query: 'just a query',
    },
  });

  // answer agent responds on the second round
  mockFinalAnswer(proxy, response);
};
