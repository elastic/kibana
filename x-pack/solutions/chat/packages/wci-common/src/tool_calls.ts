/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a tool call that was requested by the assistant
 */
export interface ToolCall {
  /**
   * The id the of tool call
   */
  toolCallId: string;
  /**
   * The complete tool name (containing the integrationId)
   */
  toolName: string;
  /**
   * Arguments that were used to call the tool
   */
  args: Record<string, any>;
}
