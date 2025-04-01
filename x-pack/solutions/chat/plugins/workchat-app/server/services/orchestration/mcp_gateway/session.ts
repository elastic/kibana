/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseToolName } from '@kbn/wci-common';
import type { McpProvider, McpClient } from '@kbn/wci-server';
import type { Logger } from '@kbn/core/server';
import { IntegrationTool, IntegrationToolInputSchema } from './types';
import { listClientsTools } from './utils';

/**
 * A request-bound
 */
export interface McpGatewaySession {
  /**
   * List all available tools from all connected integrations.
   */
  listTools(): Promise<IntegrationTool[]>;
  /**
   * Execute a tool from a specific integration.
   */
  executeTool(serverToolName: string, params: IntegrationToolInputSchema): Promise<unknown>;
  /**
   * Close the session and disconnect from all integrations.
   */
  close(): Promise<void>;
}

export class McpGatewaySessionImpl implements McpGatewaySession {
  private readonly providers: McpProvider[];
  private readonly logger: Logger;

  private sessionClients: Record<string, McpClient> = {};
  private connected = false;

  constructor({ providers, logger }: { providers: McpProvider[]; logger: Logger }) {
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

  async listTools(): Promise<IntegrationTool[]> {
    await this.ensureConnected();
    return listClientsTools({ clients: Object.values(this.sessionClients), logger: this.logger });
  }

  async executeTool(serverToolName: string, params: IntegrationToolInputSchema) {
    await this.ensureConnected();

    const { integrationId, toolName } = parseToolName(serverToolName);
    const client = this.sessionClients[integrationId];
    if (!client) {
      throw new Error(`Client not found: ${integrationId}`);
    }
    return client.callTool({
      name: toolName,
      arguments: params,
    });
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
