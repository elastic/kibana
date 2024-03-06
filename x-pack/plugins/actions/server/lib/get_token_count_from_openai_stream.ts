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
import type OpenAI from 'openai';
import { Logger } from '@kbn/logging';

export async function getTokenCountFromOpenAIStream({
  responseStream,
  body,
  logger,
}: {
  responseStream: Readable;
  body: string;
  logger: Logger;
}): Promise<{
  total: number;
  prompt: number;
  completion: number;
}> {
  const chatCompletionRequest = JSON.parse(
    body
  ) as OpenAI.ChatCompletionCreateParams.ChatCompletionCreateParamsStreaming;

  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const tokensFromMessages = encode(
    chatCompletionRequest.messages
      .map(
        (msg) =>
          `<|start|>${msg.role}\n${msg.content}\n${
            'name' in msg
              ? msg.name
              : 'function_call' in msg && msg.function_call
              ? msg.function_call.name + '\n' + msg.function_call.arguments
              : ''
          }<|end|>`
      )
      .join('\n')
  ).length;

  // this is an approximation. OpenAI cuts off a function schema
  // at a certain level of nesting, so their token count might
  // be lower than what we are calculating here.

  const tokensFromFunctions = chatCompletionRequest.functions
    ? encode(
        chatCompletionRequest.functions
          ?.map(
            (fn) =>
              `<|start|>${fn.name}\n${fn.description}\n${JSON.stringify(fn.parameters)}<|end|>`
          )
          .join('\n')
      ).length
    : 0;

  const promptTokens = tokensFromMessages + tokensFromFunctions;

  let responseBody: string = '';

  responseStream.on('data', (chunk: string) => {
    responseBody += chunk.toString();
  });

  try {
    await finished(responseStream);
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
  }

  const response = responseBody
    .split('\n')
    .filter((line) => {
      return line.startsWith('data: ') && !line.endsWith('[DONE]');
    })
    .map((line) => {
      return JSON.parse(line.replace('data: ', ''));
    })
    .filter(
      (
        line
      ): line is {
        choices: Array<{
          delta: { content?: string; function_call?: { name?: string; arguments: string } };
        }>;
      } => {
        return 'object' in line && line.object === 'chat.completion.chunk';
      }
    )
    .reduce(
      (prev, line) => {
        const msg = line.choices[0].delta!;
        prev.content += msg.content || '';
        prev.function_call.name += msg.function_call?.name || '';
        prev.function_call.arguments += msg.function_call?.arguments || '';
        return prev;
      },
      { content: '', function_call: { name: '', arguments: '' } }
    );

  const completionTokens = encode(
    JSON.stringify(
      omitBy(
        {
          content: response.content || undefined,
          function_call: response.function_call.name ? response.function_call : undefined,
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
