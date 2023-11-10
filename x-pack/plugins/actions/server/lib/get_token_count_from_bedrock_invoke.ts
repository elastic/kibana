/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';

export interface InvokeBody {
  prompt: string;
}
export async function getTokenCountFromBedrockInvoke({
  response,
  body,
}: {
  response: string;
  body: string;
}): Promise<{
  total: number;
  prompt: number;
  completion: number;
}> {
  const chatCompletionRequest = JSON.parse(body) as InvokeBody;

  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const tokensFromMessages = encode(`<|start|>${chatCompletionRequest.prompt}<|end|>`).length;

  const promptTokens = tokensFromMessages;

  const completionTokens = encode(response).length;

  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}
