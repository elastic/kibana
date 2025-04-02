/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type McpTool,
  type McpClient,
  type McpProvider,
  type McpClientFactoryFn,
  toolResult,
} from './src/mcp';
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
