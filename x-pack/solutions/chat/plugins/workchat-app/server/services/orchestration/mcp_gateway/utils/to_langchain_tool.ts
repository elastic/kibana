/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyZodObject } from '@kbn/zod';
import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { Logger } from '@kbn/core/server';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { GatewayTool } from '../types';
import { McpGatewaySession } from '../session';

export function toLangchainTool({
  tool,
  session,
  logger,
}: {
  tool: GatewayTool;
  logger: Logger;
  session: McpGatewaySession;
}): StructuredTool {
  const schema: AnyZodObject = jsonSchemaToZod(tool.inputSchema);

  return toTool(
    async (input) => {
      try {
        const result = await session.executeTool(tool.name, input);
        return JSON.stringify(result);
      } catch (e) {
        logger.warn(`error calling tool ${tool.name}: ${e.message}`);
        throw e;
      }
    },
    {
      name: tool.name,
      description: tool.description,
      schema,
    }
  );
}
