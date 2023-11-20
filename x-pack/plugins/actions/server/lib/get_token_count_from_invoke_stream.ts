/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { encode } from 'gpt-tokenizer';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

export interface InvokeBody {
  messages: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Takes the OpenAI and Bedrock `invokeStream` sub action response stream and the request messages array as inputs.
 * Uses gpt-tokenizer encoding to calculate the number of tokens in the prompt and completion parts of the response stream
 * Returns an object containing the total, prompt, and completion token counts.
 * @param responseStream the response stream from the `invokeStream` sub action
 * @param body the request messages array
 * @param logger the logger
 */
export async function getTokenCountFromInvokeStream({
  responseStream,
  body,
  logger,
}: {
  responseStream: Readable;
  body: InvokeBody;
  logger: Logger;
}): Promise<{
  total: number;
  prompt: number;
  completion: number;
}> {
  const chatCompletionRequest = body;

  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const promptTokens = encode(
    chatCompletionRequest.messages
      .map((msg) => `<|start|>${msg.role}\n${msg.content}<|end|>`)
      .join('\n')
  ).length;

  let responseBody: string = '';

  responseStream.on('data', (chunk: string) => {
    responseBody += chunk.toString();
  });
  try {
    await finished(responseStream);
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
  }

  const completionTokens = encode(responseBody).length;

  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}
