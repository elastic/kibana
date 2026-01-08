/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ToolType } from '@kbn/agent-builder-common';
import type { AgentBuilderUiFtrProviderContext } from '../../../agent_builder/services/functional';
import { createTestMcpServer, type McpServerSimulator } from '../../utils/mcp_server_simulator';
import {
  createMcpConnector,
  deleteConnectors,
  deleteToolsByPrefix,
} from '../../utils/connector_helpers';

const TOOL_PREFIX = 'ftr.mcp.';

export default function ({ getPageObjects, getService }: AgentBuilderUiFtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');

  describe('MCP tools', function () {
    let mcpServer: McpServerSimulator;
    let connectorId: string;

    before(async () => {
      // Start mock MCP server
      mcpServer = createTestMcpServer();
      await mcpServer.start();

      // Create MCP connector pointing to mock server
      const connector = await createMcpConnector(mcpServer, supertest);
      connectorId = connector.id;
    });

    after(async () => {
      await deleteConnectors(supertest);
      await deleteToolsByPrefix(supertest, TOOL_PREFIX);
      await mcpServer.stop();
    });

    describe('creating MCP tools', function () {
      it('should create an MCP tool by selecting connector and tool', async () => {
        const toolId = `ftr.mcp.${Date.now()}`;

        await agentBuilder.navigateToNewTool();
        await testSubjects.existOrFail('agentBuilderToolFormPage');

        // Select MCP tool type
        await testSubjects.existOrFail('agentBuilderToolTypeSelect');
        await agentBuilder.selectToolType(ToolType.mcp);

        // Select the MCP connector
        await testSubjects.existOrFail('agentBuilderMcpConnectorSelect');
        await agentBuilder.selectMcpConnector(connectorId);

        // Wait for tools to load from the mock server
        await agentBuilder.waitForMcpToolsToLoad();

        // Select the 'echo' tool from the mock server
        // Note: selecting an MCP tool auto-fills the tool ID, so we set our custom ID after
        await testSubjects.existOrFail('agentBuilderMcpToolSelect');
        await agentBuilder.selectMcpTool('echo');

        // Set custom tool ID (must be after MCP tool selection since it auto-fills)
        await agentBuilder.setToolId(toolId);

        // Save the tool
        await agentBuilder.saveTool();

        // Navigate to tools table and verify tool appears
        await agentBuilder.navigateToToolsLanding();
        expect(await agentBuilder.isToolInTable(toolId)).to.be(true);
      });
    });
  });
}
