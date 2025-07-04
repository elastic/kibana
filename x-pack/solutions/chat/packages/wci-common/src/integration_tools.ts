/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TOOL_NAME_SEPARATOR = '___';

export interface ToolNameAndIntegrationId {
  integrationId: string;
  toolName: string;
}

/**
 * Generates a unique tool name based on the integrationId and base tool name.
 * This is used by the orchestration layer to generate "uuids" for each integration/tool tuples.
 */
export const buildToolName = ({ integrationId, toolName }: ToolNameAndIntegrationId) => {
  return `${toolName}${TOOL_NAME_SEPARATOR}${integrationId}`;
};

export const parseToolName = (fullToolName: string): ToolNameAndIntegrationId => {
  const splits = fullToolName.split(TOOL_NAME_SEPARATOR);
  if (splits.length !== 2) {
    // TODO: figure out later
    return {
      toolName: splits[0],
      integrationId: '',
    };
    // throw new Error(`Invalid tool name format : "${fullToolName}"`);
  }
  return {
    toolName: splits[0],
    integrationId: splits[1],
  };
};
