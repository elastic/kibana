/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import { isEmpty, omitBy } from 'lodash';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

export interface InvokeBody {
  messages: Array<{
    role: string;
    content: string;
  }>;
}
export async function getTokenCountFromInvokeStream({
  responseStream,
  body,
}: {
  responseStream: Readable;
  body: InvokeBody;
}): Promise<{
  total: number;
  prompt: number;
  completion: number;
}> {
  const chatCompletionRequest = body;

  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const tokensFromMessages = encode(
    chatCompletionRequest.messages
      .map((msg) => `<|start|>${msg.role}\n${msg.content}<|end|>`)
      .join('\n')
  ).length;

  const promptTokens = tokensFromMessages;

  let responseBody: string = '';

  responseStream.on('data', (chunk: string) => {
    responseBody += chunk.toString();
  });

  try {
    await finished(responseStream);
  } catch {
    // no need to handle this explicitly
  }

  const completionTokens = encode(
    JSON.stringify(
      omitBy(
        {
          content: responseBody,
        },
        isEmpty
      )
    )
  ).length;

  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}
