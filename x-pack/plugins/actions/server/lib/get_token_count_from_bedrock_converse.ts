/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmithyMessageDecoderStream } from '@smithy/eventstream-codec';

export type SmithyStream = SmithyMessageDecoderStream<{
  metadata?: {
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  };
}>;

export const getTokensFromBedrockConverseStream = async (responseStream: SmithyStream) => {
  for await (const { metadata } of responseStream) {
    if (metadata) {
      return {
        total_tokens: metadata.usage.totalTokens,
        prompt_tokens: metadata.usage.inputTokens,
        completion_tokens: metadata.usage.outputTokens,
      };
    }
  }
  return null;
};
