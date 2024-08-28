/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType } from '../../../common/connectors';
import type { InferenceConnectorAdapter } from '../types';
import { openAIAdapter } from './openai';

export const getInferenceAdapter = (
  connectorType: InferenceConnectorType
): InferenceConnectorAdapter | undefined => {
  switch (connectorType) {
    case InferenceConnectorType.OpenAI:
      return openAIAdapter;

    case InferenceConnectorType.Bedrock:
      // not implemented yet
      break;

    case InferenceConnectorType.Gemini:
      // not implemented yet
      break;
  }

  return undefined;
};
