/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { parseToolName } from '@kbn/wci-common';
import type { McpClientProvider, McpClient } from '@kbn/wci-server';
import type { Logger } from '@kbn/core/server';
import { GatewayTool, GatewayToolInputSchema } from './types';
import { listClientsTools } from './utils';

/**
 * Represents a "session" against all registered MCP servers.
 * Allows to aggregate and list tools from all servers,
 * and to close the connectors to all of them in a single call.
 */
export interface McpGatewaySession {
  /**
   * List all available tools from all connected integrations.
   */
  listTools(): Promise<GatewayTool[]>;
  /**
   * Execute a tool from a specific integration.
   */
  executeTool(serverToolName: string, params: GatewayToolInputSchema): Promise<CallToolResult>;
  /**
   * Close the session and disconnect from all integrations.
   */
  close(): Promise<void>;
}

export class McpGatewaySessionImpl implements McpGatewaySession {
  private readonly providers: McpClientProvider[];
  private readonly logger: Logger;

  private sessionClients: Record<string, McpClient> = {};
  private connected = false;

  constructor({ providers, logger }: { providers: McpClientProvider[]; logger: Logger }) {
    this.providers = providers;
    this.logger = logger;
  }

  private async ensureConnected() {
    if (this.connected) {
      return;
    }

    this.sessionClients = await this.providers.reduce(async (accPromise, provider) => {
      const acc = await accPromise;
      try {
        acc[provider.id] = await provider.connect();
      } catch (e) {
        this.logger.warn(`Error connecting integration: ${provider.id}`);
      }
      return acc;
    }, Promise.resolve<Record<string, McpClient>>({}));

    this.connected = true;
  }

  async listTools(): Promise<GatewayTool[]> {
    await this.ensureConnected();
    // TODO: memoize / cache
    return listClientsTools({ clients: this.sessionClients, logger: this.logger });
  }

  async executeTool(serverToolName: string, params: GatewayToolInputSchema) {
    await this.ensureConnected();

    const { integrationId, toolName } = parseToolName(serverToolName);
    const client = this.sessionClients[integrationId];
    if (!client) {
      throw new Error(`Client not found: ${integrationId}`);
    }

    const response = await client.callTool({
      name: toolName,
      arguments: params,
    });

    return response as CallToolResult;
  }

  async close() {
    if (!this.connected) {
      return;
    }

    await Promise.all(Object.values(this.sessionClients).map((session) => session.disconnect()));
    this.sessionClients = {};
    this.connected = false;
  }
}
