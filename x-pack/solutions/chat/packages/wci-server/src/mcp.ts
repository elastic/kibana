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

/**
 * Internal representation of an MCP tool.
 * Mostly used to abstract the underlying MCP implementation we're using for "internal" servers
 */
export interface McpServerTool<RunInput extends ZodRawShape = ZodRawShape> {
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

export type McpClientConnectFn = () => MaybePromise<McpClient>;

export interface McpClientProvider {
  id: string;
  connect: McpClientConnectFn;
  meta?: Record<string, unknown>;
}
