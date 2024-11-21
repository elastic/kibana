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

const handleAsyncGenerator = async function* (
  responseStream: SmithyStream,
  cb?: (tokens: unknown) => void
) {
  for await (const chunk of responseStream) {
    console.log('W00f yield chunk', chunk);
    if (cb && chunk.metadata) {
      cb({
        total_tokens: chunk.metadata.usage.totalTokens,
        prompt_tokens: chunk.metadata.usage.inputTokens,
        completion_tokens: chunk.metadata.usage.outputTokens,
      });
    }
    yield chunk; // Yielding chunks to the caller
  }
};

export const getTokensFromBedrockConverseStream = async function* (responseStream: SmithyStream) {
  let finalTokens = null;

  const cb = (tokens: unknown) => {
    console.log('W00f cbtokens', tokens);
    finalTokens = tokens;
  };

  const generator = handleAsyncGenerator(responseStream, cb);

  // Yield chunks back to the caller while processing tokens
  for await (const chunk of generator) {
    console.log('W00f processed chunk', chunk); // Log the chunk
    yield chunk; // Yield the chunk back to the caller
  }

  console.log('W00f finalTokens', finalTokens); // Log the final tokens
  return finalTokens; // Return the final tokens once the generator finishes
};
