/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import { ToolType } from '@kbn/agent-builder-common';
import type { AgentBuilderUiFtrProviderContext } from '../../../agent_builder/services/functional';
import { createTestMcpServer, type McpServerSimulator } from '../../utils/mcp_server_simulator';
import { createMcpConnector, deleteConnectors } from '../../utils/connector_helpers';

const TOOL_PREFIX = 'ftr.mcp.';

async function deleteToolsByPrefix(supertest: SuperTest.Agent, prefix: string): Promise<void> {
  const response = await supertest.get('/api/agent_builder/tools').expect(200);
  const tools = response.body.results || [];

  await Promise.allSettled(
    tools
      .filter((tool: { id: string }) => tool.id.startsWith(prefix))
      .map((tool: { id: string }) =>
        supertest.delete(`/api/agent_builder/tools/${tool.id}`).set('kbn-xsrf', 'true')
      )
  );
}

export default function ({ getPageObjects, getService }: AgentBuilderUiFtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');

  // Failing: See https://github.com/elastic/kibana/issues/248906
  describe.skip('MCP tools', function () {
    let mcpServer: McpServerSimulator;
    let mcpServerUrl: string;
    let connectorId: string;

    before(async () => {
      // Start mock MCP server
      mcpServer = createTestMcpServer();
      mcpServerUrl = await mcpServer.start();

      // Create MCP connector pointing to mock server
      const connector = await createMcpConnector(mcpServerUrl, supertest);
      connectorId = connector.id;
    });

    after(async () => {
      await deleteConnectors(supertest);
      await deleteToolsByPrefix(supertest, TOOL_PREFIX);
      await mcpServer.stop();
    });

    describe('creating MCP tools', function () {
      it('should create an MCP tool by selecting connector and tool', async () => {
        const toolId = `${TOOL_PREFIX}create.${Date.now()}`;

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

    describe('editing MCP tools', function () {
      it('should edit an MCP tool description', async () => {
        const toolId = `${TOOL_PREFIX}edit.${Date.now()}`;
        const newDescription = 'Updated MCP tool description';

        // Create tool via API
        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'true')
          .send({
            id: toolId,
            type: 'mcp',
            description: 'Original description',
            tags: [],
            configuration: {
              connector_id: connectorId,
              tool_name: 'echo',
            },
          })
          .expect(200);

        // Navigate to tool and edit
        await agentBuilder.navigateToTool(toolId);
        await testSubjects.existOrFail('agentBuilderToolFormPage');

        await agentBuilder.setToolDescription(newDescription);
        await agentBuilder.saveTool();

        // Reload and verify description was updated
        await agentBuilder.navigateToTool(toolId);
        const description = await agentBuilder.getToolDescriptionValue();
        expect(description).to.contain(newDescription);
      });
    });

    describe('cloning MCP tools', function () {
      it('should clone an MCP tool and select a different server tool (add)', async () => {
        const sourceToolId = `${TOOL_PREFIX}clone.source.${Date.now()}`;
        const clonedToolId = `${TOOL_PREFIX}clone.copy.${Date.now()}`;

        // Create source tool via API (using 'add' tool)
        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'true')
          .send({
            id: sourceToolId,
            type: 'mcp',
            description: 'Tool to be cloned',
            tags: [],
            configuration: {
              connector_id: connectorId,
              tool_name: 'add',
            },
          })
          .expect(200);

        // Navigate to tool and clone
        await agentBuilder.navigateToTool(sourceToolId);
        await testSubjects.existOrFail('agentBuilderToolFormPage');

        await agentBuilder.openToolContextMenu();
        await agentBuilder.clickToolCloneButton();

        // Cloning keeps the same MCP server but requires selecting a tool
        // Select a different tool ('echo') from the same server
        await agentBuilder.waitForMcpToolsToLoad();
        await agentBuilder.selectMcpTool('echo');

        // Set new ID for cloned tool
        await agentBuilder.setToolId(clonedToolId);
        await agentBuilder.saveTool();

        // Verify both tools exist in table
        await agentBuilder.navigateToToolsLanding();
        expect(await agentBuilder.isToolInTable(sourceToolId)).to.be(true);
        expect(await agentBuilder.isToolInTable(clonedToolId)).to.be(true);
      });
    });

    describe('deleting MCP tools', function () {
      it('should delete an MCP tool', async () => {
        const toolId = `${TOOL_PREFIX}delete.${Date.now()}`;

        // Create tool via API
        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'true')
          .send({
            id: toolId,
            type: 'mcp',
            description: 'Tool to be deleted',
            tags: [],
            configuration: {
              connector_id: connectorId,
              tool_name: 'echo',
            },
          })
          .expect(200);

        // Navigate to tool
        await agentBuilder.navigateToTool(toolId);
        await testSubjects.existOrFail('agentBuilderToolFormPage');

        // Delete via context menu
        await agentBuilder.openToolContextMenu();
        await agentBuilder.clickToolDeleteButton();
        await agentBuilder.confirmModalConfirm();

        // Verify tool is gone
        await agentBuilder.navigateToToolsLanding();
        expect(await agentBuilder.isToolInTable(toolId)).to.be(false);
      });
    });

    describe('executing MCP tools', function () {
      it('should execute the add tool and receive correct result', async () => {
        const toolId = `${TOOL_PREFIX}execute.${Date.now()}`;

        // Create tool via API using the 'add' tool
        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'true')
          .send({
            id: toolId,
            type: 'mcp',
            description: 'Tool for execution test',
            tags: [],
            configuration: {
              connector_id: connectorId,
              tool_name: 'add',
            },
          })
          .expect(200);

        // Navigate to the tool
        await agentBuilder.navigateToTool(toolId);
        await testSubjects.existOrFail('agentBuilderToolFormPage');

        // Open test flyout
        await agentBuilder.openToolTestFlyout();
        await testSubjects.existOrFail('agentBuilderToolTestFlyout');

        // Fill in parameters: a=5, b=3
        await agentBuilder.setToolTestInput('a', 5);
        await agentBuilder.setToolTestInput('b', 3);

        // Submit the test
        await agentBuilder.submitToolTest();

        // Wait for response and verify result
        await agentBuilder.waitForToolTestResponseNotEmpty();
        const response = await agentBuilder.getToolTestResponse();

        // The 'add' tool returns the sum as text, expect "8"
        expect(response).to.contain('8');
      });
    });

    describe('bulk importing MCP tools', function () {
      it('should bulk import MCP tools via the UI', async () => {
        const namespace = `${TOOL_PREFIX}bulk.${Date.now()}`;

        // Navigate to bulk import page via the Manage MCP menu
        await agentBuilder.navigateToToolsLanding();
        await agentBuilder.openManageMcpMenu();
        await agentBuilder.clickBulkImportMcpMenuItem();

        // Wait for bulk import page to load
        await testSubjects.existOrFail('agentBuilderBulkImportMcpToolsPage');

        // Select the MCP connector
        await agentBuilder.selectBulkImportConnector(connectorId);

        // Wait for tools to load from the mock server
        await agentBuilder.waitForBulkImportToolsToLoad();

        // Select multiple tools to import (subtract and multiply)
        await agentBuilder.selectBulkImportToolCheckbox('subtract');
        await agentBuilder.selectBulkImportToolCheckbox('multiply');

        // Set the namespace for imported tools
        await agentBuilder.setBulkImportNamespace(namespace);

        // Click import button
        await agentBuilder.clickBulkImportSubmit();

        // Should navigate back to tools list after successful import
        await testSubjects.existOrFail('agentBuilderToolsTable');

        // Verify both imported tools appear in the table
        expect(await agentBuilder.isToolInTable(`${namespace}.subtract`)).to.be(true);
        expect(await agentBuilder.isToolInTable(`${namespace}.multiply`)).to.be(true);
      });
    });

    describe('error handling', function () {
      let errorTestConnector: Awaited<ReturnType<typeof createMcpConnector>>;

      before(async () => {
        // Stop the MCP server to simulate unavailability
        await mcpServer.stop();

        // Create a NEW connector after stopping the server.
        // The MCP connector has a 15-minute backend cache for listTools results (see LIST_TOOLS_CACHE_TTL_MS).
        // If we reuse the existing connector, cached tools would be returned even though the server is down.
        // A new connector has a different cache key, so it will actually try to reach the (now stopped) server.
        errorTestConnector = await createMcpConnector(mcpServerUrl, supertest, {
          name: 'ftr-error-test-connector',
        });
      });

      after(async () => {
        // Restart the MCP server for any tests that follow
        await mcpServer.start();
      });

      it('should show error banner when MCP server is unavailable during tool creation', async () => {
        await agentBuilder.navigateToToolsLanding();
        await agentBuilder.navigateToNewTool();

        await testSubjects.existOrFail('agentBuilderToolFormPage');
        await agentBuilder.selectToolType(ToolType.mcp);
        await agentBuilder.selectMcpConnector(errorTestConnector.id);

        await testSubjects.existOrFail('agentBuilderMcpHealthBanner-list_tools_failed');
      });
    });
  });
}
