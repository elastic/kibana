/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonSchemaObject } from '@n8n/json-schema-to-zod';
import { parseToolName, buildToolName } from '@kbn/wci-common';
import type { McpProvider, McpClient } from '@kbn/wci-server';
import type { Logger } from '@kbn/core/server';
import { IntegrationToolInputSchema, IntegrationTool } from './types';

/**
 * Interface used to manage the integrations session.
 * It is responsible for connecting to the integrations (internal & external) and executing tools.
 * It also provides a way to get all the tools from all the integrations.
 */
export interface IntegrationsSession {
  /**
   * List all available tools from all connected integrations.
   */
  listTools(): Promise<IntegrationTool[]>;
  /**
   * Execute a tool from a specific integration
   */
  executeTool(serverToolName: string, params: IntegrationToolInputSchema): Promise<unknown>;
  /**
   * Disconnect from all integrations
   */
  disconnect(): Promise<void>;
}

export class IntegrationsSessionImpl implements IntegrationsSession {
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

    const toolCalls = await Promise.all(
      Object.keys(this.sessionClients).map(async (clientId) => {
        try {
          const client = this.sessionClients[clientId];
          const toolsResponse = await client.listTools();
          if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
            return toolsResponse.tools.map((tool) => ({
              name: buildToolName({ integrationId: clientId, toolName: tool.name }),
              description: tool.description || '',
              inputSchema: (tool.inputSchema || {}) as JsonSchemaObject,
            }));
          }
          return [];
        } catch (err) {
          this.logger.warn(`Error fetching tools for client: ${clientId}`);
          return [];
        }
      })
    );

    return toolCalls.flat();
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

  async disconnect() {
    if (!this.connected) {
      return;
    }

    await Promise.all(Object.values(this.sessionClients).map((session) => session.disconnect()));
    this.sessionClients = {};
    this.connected = false;
  }
}
