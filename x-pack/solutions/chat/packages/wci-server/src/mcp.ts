/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodRawShape, ZodTypeAny } from '@kbn/zod';
import type { Client as McpBaseClient } from '@modelcontextprotocol/sdk/client/index';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MaybePromise } from '@kbn/utility-types';

export interface McpTool<RunInput extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  schema: RunInput;
  execute: (args: z.objectOutputType<RunInput, ZodTypeAny>) => MaybePromise<CallToolResult>;
}

/**
 * Wrapper on top of the MCP client implementation to avoid leaking internals
 * and to control which APIs are supported.
 */
export type McpClient = Pick<McpBaseClient, 'listTools' | 'callTool'> & {
  /**
   * Disconnect the client. Note that once disconnected, it can't
   * be connected again.
   */
  disconnect: () => Promise<void>;
};

export type McpClientFactoryFn = () => MaybePromise<McpClient>;

export interface McpProvider {
  id: string;
  connect: McpClientFactoryFn;
  meta?: Record<string, unknown>;
}

/**
 * Utility factory to generate MCP call tool results
 */
export const toolResult = {
  text: (text: string): CallToolResult => {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  },
  error: (message: string): CallToolResult => {
    return {
      content: [
        {
          type: 'text',
          text: `Error during tool execution: ${message}`,
        },
      ],
      isError: true,
    };
  },
};
