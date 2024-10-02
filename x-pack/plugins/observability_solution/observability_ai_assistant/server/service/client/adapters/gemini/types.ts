/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GenerateContentResponseFunctionCall {
  name: string;
  args: Record<string, any>;
}

interface GenerateContentResponseSafetyRating {
  category: string;
  probability: string;
}

interface GenerateContentResponseCandidate {
  content: {
    parts: Array<{
      text?: string;
      functionCall?: GenerateContentResponseFunctionCall;
    }>;
  };
  finishReason?: string;
  index: number;
  safetyRatings?: GenerateContentResponseSafetyRating[];
}

interface GenerateContentResponsePromptFeedback {
  promptFeedback: {
    safetyRatings: GenerateContentResponseSafetyRating[];
  };
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GenerateContentResponseUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface GoogleGenerateContentResponseChunk {
  candidates: GenerateContentResponseCandidate[];
  promptFeedback?: GenerateContentResponsePromptFeedback;
  usageMetadata?: GenerateContentResponseUsageMetadata;
}
