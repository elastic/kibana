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
import type { QueryResult, EsqlResults } from '@kbn/agent-builder-common';
import { setupAgentCallSearchToolWithEsqlThenAnswer } from '../../utils/proxy_scenario';
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
      let queryResult: QueryResult;
      let esqlResults: EsqlResults;

      const USER_PROMPT = 'Please find a single trace with `service.name:java-backend`';
      const MOCKED_LLM_TITLE = 'Mocked conversation title';
      const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
      const MOCKED_ESQL_QUERY =
        'FROM traces-apm-default\n| WHERE service.name == "java-backend"\n| LIMIT 100';

      let body: ChatResponse;

      before(async () => {
        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateApmData(apmSynthtraceEsClient);

        await setupAgentCallSearchToolWithEsqlThenAnswer({
          proxy: llmProxy,
          title: MOCKED_LLM_TITLE,
          resourceName: 'traces-apm-default',
          resourceType: 'data_stream',
          response: MOCKED_LLM_RESPONSE,
          esqlQuery: MOCKED_ESQL_QUERY,
        });

        body = await agentBuilderApiClient.converse({
          input: USER_PROMPT,
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

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });
        await apmSynthtraceEsClient.clean();
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

      it('returns the response from the LLM', async () => {
        expect(body.response.message).to.eql(MOCKED_LLM_RESPONSE);
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
