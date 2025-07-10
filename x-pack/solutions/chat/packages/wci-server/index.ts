/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type McpServerTool,
  type McpClient,
  type McpClientProvider,
  type McpClientConnectFn,
} from './src/mcp';
export {
  type ToolContentResult,
  type ContentResultTransportFormat,
  isContentResultTransportFormat,
  toolResultFactory,
} from './src/tool_result';
export {
  getConnectToInternalServer,
  getConnectToExternalServer,
  createMcpServer,
} from './src/utils';
export type {
  IntegrationContext,
  WorkChatIntegration,
  WorkchatIntegrationDefinition,
} from './src/integration';
