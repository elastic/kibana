/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index';
import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core/server';
import type { IntegrationType, IntegrationConfiguration } from '@kbn/wci-common';
/**
 * Represents the definition of a type of integration for WorkChat.
 *
 * This is the top level entity for integration, which is the source
 * of all things related to this integration type, such as being
 * able to create an actual integration instance.
 */
export interface WorkchatIntegrationDefinition<
  T extends IntegrationConfiguration = IntegrationConfiguration
> {
  /**
   * Returns the type of integration.
   */
  getType(): IntegrationType;

  /**
   * Creates an integration instance based on the provided context
   */
  createIntegration(context: IntegrationContext<T>): MaybePromise<WorkChatIntegration>;
}

export interface IntegrationContext<T extends IntegrationConfiguration> {
  request: KibanaRequest;
  description: string;
  configuration: T;
}

/**
 * Represents an instance of an integration type.
 */
export interface WorkChatIntegration {
  /**
   * Type of integration
   */
  type: IntegrationType;
  /**
   * Client attached to this integration
   */
  client: IntegrationClient;
}

// TODO: Omit<McpClient, 'close'>

/**
 * Wrapper around MCP client.
 *
 * Note that `disconnect` should be called on this instance rather than on the attached McpClient.
 */
export interface IntegrationClient {
  connect: () => Promise<McpClient>;
  disconnect: () => Promise<void>;
}
