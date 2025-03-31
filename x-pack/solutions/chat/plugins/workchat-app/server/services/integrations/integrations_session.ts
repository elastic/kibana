/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { JsonSchemaObject } from '@n8n/json-schema-to-zod';
import type { Logger } from '@kbn/core/server';
import { parseToolName, buildToolName } from '@kbn/wci-common';
import { IntegrationToolInputSchema, IntegrationTool } from './types';
import type { IntegrationWithMeta } from './types';

/**
 * Interface used to manage the integrations session.
 * It is responsible for connecting to the integrations (internal & external) and executing tools.
 * It also provides a way to get all the tools from all the integrations.
 */
export interface IntegrationsSession {
  /**
   * Get all available tools from all connected integrations
   */
  getAllTools(): Promise<IntegrationTool[]>;

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
  private readonly integrations: IntegrationWithMeta[];
  private readonly logger: Logger;

  private sessionState: Record<string, IntegrationState> = {};
  private connected = false;

  constructor({ integrations, logger }: { integrations: IntegrationWithMeta[]; logger: Logger }) {
    this.integrations = integrations;
    this.logger = logger;
  }

  private async ensureConnected() {
    if (this.connected) {
      return;
    }

    this.sessionState = await this.integrations.reduce(async (accPromise, integration) => {
      const acc = await accPromise;
      try {
        const integClient = integration.client;
        acc[integration.id] = {
          client: await integClient.connect(),
          disconnect: integClient.disconnect,
        };
      } catch (e) {
        this.logger.warn(`Error connecting integration: ${integration.id}`);
      }
      return acc;
    }, Promise.resolve<Record<string, IntegrationState>>({}));

    this.connected = true;
  }

  async getAllTools(): Promise<IntegrationTool[]> {
    await this.ensureConnected();

    const toolCalls = await Promise.all(
      Object.keys(this.sessionState).map(async (clientId) => {
        try {
          const client = this.sessionState[clientId].client;
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
    const integration = this.sessionState[integrationId];
    if (!integration) {
      throw new Error(`Client not found: ${integrationId}`);
    }
    return integration.client.callTool({
      name: toolName,
      arguments: params,
    });
  }

  async disconnect() {
    if (!this.connected) {
      return;
    }

    await Promise.all(Object.values(this.sessionState).map((session) => session.disconnect()));
    this.sessionState = {};
    this.connected = false;
  }
}

interface IntegrationState {
  client: Client;
  disconnect: () => Promise<void>;
}
