/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from '@kbn/zod';
import { loggerMock } from '@kbn/logging-mocks';
import { buildToolName } from '@kbn/wci-common';
import { getConnectToInternalServer } from '@kbn/wci-server';
import { IntegrationWithMeta, IntegrationToolInputSchema } from './types';
import { IntegrationsSessionImpl } from './integrations_session';

describe('IntegrationsGateway', () => {
  describe('MCP servers with tools', () => {
    const logger = loggerMock.create();

    const serverA = () => {
      const server = new McpServer({
        name: 'Test Server 1',
        version: '1.0.0',
      });

      server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
        content: [{ type: 'text', text: String(a + b) }],
      }));

      return server;
    };

    const serverB = () => {
      const server = new McpServer({
        name: 'Test Server 2',
        version: '1.0.0',
      });

      server.tool('tool3', { test: z.string() }, async ({ test }) => ({
        content: [
          { type: 'text', text: `Tool 3 executed with params: ${JSON.stringify({ test })}` },
        ],
      }));

      return server;
    };

    const getIntegrations = async () => {
      const integration1: IntegrationWithMeta = {
        id: 'Test Server 1',
        type: 'test1' as any,
        client: await getConnectToInternalServer({ server: serverA() }),
      };

      const integration2: IntegrationWithMeta = {
        id: 'Test Server 2',
        type: 'test2' as any,
        client: await getConnectToInternalServer({ server: serverB() }),
      };

      return [integration1, integration2];
    };

    it('should register multiple MCP servers with tools and call all tools', async () => {
      const integrationSession = new IntegrationsSessionImpl({
        logger,
        integrations: await getIntegrations(),
      });

      const allTools = await integrationSession.listTools();
      expect(allTools.length).toBe(2);
      expect(allTools.map((tool) => tool.name)).toEqual([
        buildToolName({ integrationId: 'Test Server 1', toolName: 'add' }),
        buildToolName({ integrationId: 'Test Server 2', toolName: 'tool3' }),
      ]);
    });

    it('should allow to call a tool', async () => {
      const integrationSession = new IntegrationsSessionImpl({
        logger,
        integrations: await getIntegrations(),
      });

      const result = await integrationSession.executeTool(
        buildToolName({ integrationId: 'Test Server 1', toolName: 'add' }),
        {
          a: 1,
          b: 2,
        } as unknown as IntegrationToolInputSchema
      );
      expect(result).toEqual({ content: [{ type: 'text', text: '3' }] });
    });
  });
});
