/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { Logger } from '@kbn/core/server';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { IntegrationTool } from '../types';
import { McpGatewaySession } from '../session';

export async function getLCTools({
  session,
  logger,
}: {
  session: McpGatewaySession;
  logger: Logger;
}): Promise<StructuredTool[]> {
  const tools = await session.listTools();
  return tools.map((tool) =>
    toLangchainTool(tool, async (input) => {
      try {
        const result = await session.executeTool(tool.name, input);
        return JSON.stringify(result);
      } catch (e) {
        logger.warn(`error calling tool ${tool.name}: ${e.message}`);
        throw e;
      }
    })
  );
}

function toLangchainTool(
  integrationTool: IntegrationTool,
  action: (input: any) => Promise<string>
): StructuredTool {
  const schema = jsonSchemaToZod(integrationTool.inputSchema);

  return toTool(action, {
    name: integrationTool.name,
    description: integrationTool.description,
    schema,
  });
}
