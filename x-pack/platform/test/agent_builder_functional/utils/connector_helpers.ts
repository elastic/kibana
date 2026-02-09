/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { AgentBuilderApiFtrProviderContext } from '../../agent_builder/services/api';
import { createLlmProxy, type LlmProxy } from '../../agent_builder_api_integration/utils/llm_proxy';
/**
 * Creates a basic auth connector for the LLM proxy
 */
export async function createConnector(proxy: LlmProxy, supertest: SuperTest.Agent) {
  await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'llm-proxy')
    .send({
      name: 'llm-proxy',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
      connector_type_id: '.gen-ai',
    })
    .expect(200);
}

/**
 * Deletes all existing connectors
 */
export async function deleteConnectors(supertest: SuperTest.Agent) {
  const connectors = await supertest.get('/api/actions/connectors').expect(200);
  const promises = connectors.body.map((connector: { id: string }) => {
    return supertest
      .delete(`/api/actions/connector/${connector.id}`)
      .set('kbn-xsrf', 'llm-proxy')
      .expect(204);
  });

  return Promise.all(promises);
}

/**
 * Sets up a connector for testing
 * @param getService
 * @returns the LLM proxy
 */
export async function setupConnector(getService: AgentBuilderApiFtrProviderContext['getService']) {
  const supertest = getService('supertest');
  const llmProxy = await createLlmProxy(getService('log'));
  await createConnector(llmProxy, supertest);
  return llmProxy;
}

/**
 * Cleans up all created connectors
 * @param getService
 */
export async function teardownConnector(
  getService: AgentBuilderApiFtrProviderContext['getService'],
  llmProxy: LlmProxy
) {
  llmProxy.close();
  const supertest = getService('supertest');
  await deleteConnectors(supertest);
}

/**
 * Creates an MCP connector pointing to an MCP server URL
 */
export async function createMcpConnector(
  serverUrl: string,
  supertest: SuperTest.Agent,
  options: { name?: string } = {}
): Promise<{ id: string }> {
  const response = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'mcp-test')
    .send({
      name: options.name ?? 'mcp-test-connector',
      config: {
        serverUrl,
        hasAuth: false,
      },
      secrets: {},
      connector_type_id: '.mcp',
    })
    .expect(200);

  return { id: response.body.id };
}
