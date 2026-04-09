/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ChatResponse } from '@kbn/agent-builder-plugin/common/http_api/chat';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { QueryResult, EsqlResults, ToolCallStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import {
  setupAgentCallSearchToolWithEsqlThenAnswer,
  setupAgentParallelToolCallsThenAnswer,
} from '../../utils/proxy_scenario';
import { createLlmProxy, type LlmProxy } from '../../utils/llm_proxy';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../../utils/llm_proxy/llm_proxy_action_connector';
import { createAgentBuilderApiClient, type ExecutionMode } from '../../utils/agent_builder_client';
import type { AgentBuilderApiFtrProviderContext } from '../../../agent_builder/services/api';

export function createToolCallingTests(executionMode: ExecutionMode) {
  return function ({ getService }: AgentBuilderApiFtrProviderContext) {
    const supertest = getService('supertest');
    const log = getService('log');
    const synthtrace = getService('synthtrace');
    const agentBuilderApiClient = createAgentBuilderApiClient(supertest, { executionMode });

    describe(`[${executionMode}] tool calling`, () => {
      let llmProxy: LlmProxy;
      let connectorId: string;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateApmData(apmSynthtraceEsClient);
      });

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });
        await apmSynthtraceEsClient.clean();
      });

      describe('single tool call (search with esql)', () => {
        let queryResult: QueryResult;
        let esqlResults: EsqlResults;
        let body: ChatResponse;

        const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
        const MOCKED_ESQL_QUERY =
          'FROM traces-apm-default\n| WHERE service.name == "java-backend"\n| LIMIT 100';

        before(async () => {
          await setupAgentCallSearchToolWithEsqlThenAnswer({
            proxy: llmProxy,
            title: 'Mocked conversation title',
            resourceName: 'traces-apm-default',
            resourceType: 'data_stream',
            response: MOCKED_LLM_RESPONSE,
            esqlQuery: MOCKED_ESQL_QUERY,
          });

          body = await agentBuilderApiClient.converse({
            input: 'Please find a single trace with `service.name:java-backend`',
            connector_id: connectorId,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const handoverRequest = llmProxy.interceptedRequests.find(
            (request) => request.matchingInterceptorName === 'handover-to-answer'
          )!.requestBody;

          const esqlToolCallMsg = handoverRequest.messages[handoverRequest.messages.length - 1]!;

          expect(esqlToolCallMsg.role).to.eql('tool');

          const toolCallContent = JSON.parse(esqlToolCallMsg?.content as string);
          [queryResult, esqlResults] = toolCallContent.results as [QueryResult, EsqlResults];
        });

        it('sends the correct esql query to the LLM', () => {
          expect(queryResult.type).to.be('query');
          expect('esql' in queryResult.data ? queryResult.data.esql : '').to.be(MOCKED_ESQL_QUERY);
        });

        it('sends the correct esql result to the LLM', () => {
          expect(esqlResults.type).to.be('esql_results');
          expect(esqlResults).have.property('tool_result_id');
          expect(esqlResults.data.query).to.be(MOCKED_ESQL_QUERY);
          expect(esqlResults.data.values).to.have.length(15);
        });

        it('returns the response from the LLM', () => {
          expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);
        });
      });

      describe('parallel tool calls', () => {
        let body: ChatResponse;

        const MOCKED_LLM_RESPONSE = 'Here are the results from both tools';

        before(async () => {
          await setupAgentParallelToolCallsThenAnswer({
            proxy: llmProxy,
            title: 'Parallel tool calls',
            response: MOCKED_LLM_RESPONSE,
            toolCalls: [
              { name: 'platform_core_list_indices', args: { pattern: '*' } },
              {
                name: 'platform_core_get_index_mapping',
                args: { indices: ['traces-apm-default'] },
              },
            ],
          });

          body = await agentBuilderApiClient.converse({
            input: 'List all indices and get mappings for traces-apm-default',
            connector_id: connectorId,
          });

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        });

        it('returns the response from the LLM', () => {
          expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);
        });

        it('returns two tool call steps', () => {
          const toolCallSteps = body.steps.filter(
            (step) => step.type === ConversationRoundStepType.toolCall
          ) as ToolCallStep[];

          expect(toolCallSteps).to.have.length(2);
        });

        it('assigns the same tool_call_group_id to both steps', () => {
          const toolCallSteps = body.steps.filter(
            (step) => step.type === ConversationRoundStepType.toolCall
          ) as ToolCallStep[];

          const groupId = toolCallSteps[0].tool_call_group_id;
          expect(groupId).to.be.a('string');
          expect(groupId).to.not.be('');
          expect(toolCallSteps[1].tool_call_group_id).to.eql(groupId);
        });

        it('returns results for both tool calls', () => {
          const toolCallSteps = body.steps.filter(
            (step) => step.type === ConversationRoundStepType.toolCall
          ) as ToolCallStep[];

          expect(toolCallSteps[0].results.length).to.be.greaterThan(0);
          expect(toolCallSteps[1].results.length).to.be.greaterThan(0);
        });
      });
    });
  };
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
