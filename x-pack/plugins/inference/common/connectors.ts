/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum InferenceConnectorType {
  OpenAI = '.gen-ai',
  Bedrock = '.bedrock',
  Gemini = '.gemini',
}

export interface InferenceConnector {
  type: InferenceConnectorType;
  name: string;
  connectorId: string;
}

export function isSupportedConnectorType(id: string): id is InferenceConnectorType {
  return (
    id === InferenceConnectorType.OpenAI ||
    id === InferenceConnectorType.Bedrock ||
    id === InferenceConnectorType.Gemini
  );
}
