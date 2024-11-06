/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType } from '../../../common/connectors';
import { getInferenceAdapter } from './get_inference_adapter';
import { openAIAdapter } from './openai';
import { geminiAdapter } from './gemini';
import { bedrockClaudeAdapter } from './bedrock';

describe('getInferenceAdapter', () => {
  it('returns the openAI adapter for OpenAI type', () => {
    expect(getInferenceAdapter(InferenceConnectorType.OpenAI)).toBe(openAIAdapter);
  });

  it('returns the gemini adapter for Gemini type', () => {
    expect(getInferenceAdapter(InferenceConnectorType.Gemini)).toBe(geminiAdapter);
  });

  it('returns the bedrock adapter for Bedrock type', () => {
    expect(getInferenceAdapter(InferenceConnectorType.Bedrock)).toBe(bedrockClaudeAdapter);
  });
});
