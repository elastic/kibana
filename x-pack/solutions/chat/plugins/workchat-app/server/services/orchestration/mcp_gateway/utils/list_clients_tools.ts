/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonSchemaObject } from '@n8n/json-schema-to-zod';
import { buildToolName } from '@kbn/wci-common';
import type { McpClient } from '@kbn/wci-server';
import type { Logger } from '@kbn/core/server';
import { GatewayTool } from '../types';

/**
 * Retrieve all the tools from a list of MCP clients.
 */
export const listClientsTools = async ({
  clients,
  logger,
}: {
  clients: Record<string, McpClient>;
  logger?: Logger;
}): Promise<GatewayTool[]> => {
  const clientsTools = await Promise.all(
    Object.entries(clients).map<Promise<GatewayTool[]>>(async ([clientId, client]) => {
      try {
        const toolsResponse = await client.listTools();
        if (toolsResponse?.tools?.length) {
          return toolsResponse.tools.map((tool) => ({
            name: buildToolName({ integrationId: clientId, toolName: tool.name }),
            description: tool.description || '',
            inputSchema: (tool.inputSchema || {}) as JsonSchemaObject,
          }));
        }
        return [];
      } catch (err) {
        logger?.warn(`Error fetching tools for client: ${clientId}`);
        return [];
      }
    })
  );

  return clientsTools.flat();
};
