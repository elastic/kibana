/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { AgentBuilderApiFtrProviderContext } from '../../agent_builder/services/api';
import { createLlmProxy, type LlmProxy } from '../../agent_builder_api_integration/utils/llm_proxy';
import type { McpServerSimulator } from './mcp_server_simulator';
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
 * Creates an MCP connector pointing to the MCP server simulator
 */
export async function createMcpConnector(
  mcpServer: McpServerSimulator,
  supertest: SuperTest.Agent,
  options: { name?: string } = {}
): Promise<{ id: string }> {
  const response = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'mcp-test')
    .send({
      name: options.name ?? 'mcp-test-connector',
      config: {
        serverUrl: mcpServer.getUrl(),
        hasAuth: false,
      },
      secrets: {},
      connector_type_id: '.mcp',
    })
    .expect(200);

  return { id: response.body.id };
}

/**
 * Sets up an MCP connector with the test server
 */
export async function setupMcpConnector(
  getService: AgentBuilderApiFtrProviderContext['getService'],
  mcpServer: McpServerSimulator,
  options: { name?: string } = {}
): Promise<{ id: string }> {
  const supertest = getService('supertest');
  return createMcpConnector(mcpServer, supertest, options);
}

/**
 * Deletes all tools matching a prefix
 */
export async function deleteToolsByPrefix(
  supertest: SuperTest.Agent,
  prefix: string
): Promise<void> {
  // List all tools
  const response = await supertest.get('/api/agent_builder/tools').expect(200);
  const tools = response.body.results || [];

  // Filter by prefix and delete
  for (const tool of tools) {
    if (tool.id.startsWith(prefix)) {
      try {
        await supertest.delete(`/api/agent_builder/tools/${tool.id}`).set('kbn-xsrf', 'true');
      } catch {
        // Tool may already be deleted
      }
    }
  }
}
