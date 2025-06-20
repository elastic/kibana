/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServerTool } from '../mcp';

export const createMcpServer = ({
  name,
  version = '1.0.0',
  tools,
}: {
  name: string;
  version?: string;
  tools: McpServerTool[];
}): McpServer => {
  const server = new McpServer({
    name,
    version,
  });

  tools.forEach((tool) => {
    server.tool(tool.name, tool.description, tool.schema, async (params) => {
      return tool.execute(params);
    });
  });

  return server;
};
