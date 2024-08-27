/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType } from '../../../common/connectors';
import { getInferenceAdapter } from './get_inference_adapter';
import { openAIAdapter } from './openai';

describe('getInferenceAdapter', () => {
  it('returns the openAI adapter for OpenAI type', () => {
    expect(getInferenceAdapter(InferenceConnectorType.OpenAI)).toBe(openAIAdapter);
  });

  it('returns undefined for Bedrock type', () => {
    expect(getInferenceAdapter(InferenceConnectorType.Bedrock)).toBe(undefined);
  });

  it('returns undefined for Gemini type', () => {
    expect(getInferenceAdapter(InferenceConnectorType.Gemini)).toBe(undefined);
  });
});
