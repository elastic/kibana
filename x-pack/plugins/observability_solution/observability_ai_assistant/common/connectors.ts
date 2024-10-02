/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ObservabilityAIAssistantConnectorType {
  Bedrock = '.bedrock',
  OpenAI = '.gen-ai',
  Gemini = '.gemini',
}

export const SUPPORTED_CONNECTOR_TYPES = [
  ObservabilityAIAssistantConnectorType.OpenAI,
  ObservabilityAIAssistantConnectorType.Bedrock,
  ObservabilityAIAssistantConnectorType.Gemini,
];

export function isSupportedConnectorType(
  type: string
): type is ObservabilityAIAssistantConnectorType {
  return (
    type === ObservabilityAIAssistantConnectorType.Bedrock ||
    type === ObservabilityAIAssistantConnectorType.OpenAI ||
    type === ObservabilityAIAssistantConnectorType.Gemini
  );
}
