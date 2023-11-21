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
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';

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
  actionTypeId,
  responseStream,
  body,
  logger,
}: {
  actionTypeId: string;
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

  const isBedrock = actionTypeId === '.bedrock';
  const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);

  responseStream.on('data', (chunk) => {
    if (isBedrock) {
      const event = awsDecoder.decode(chunk);
      const parsed = JSON.parse(
        Buffer.from(JSON.parse(new TextDecoder().decode(event.body)).bytes, 'base64').toString()
      );
      responseBody += parsed.completion;
    } else {
      responseBody += chunk.toString();
    }
  });
  try {
    await finished(responseStream);
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
  }

  const parsedResponse = isBedrock ? responseBody : parseOpenAIResponse(responseBody);

  const completionTokens = encode(parsedResponse).length;

  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}

const parseOpenAIResponse = (responseBody: string) => {
  return responseBody
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
    .reduce((prev, line) => {
      const msg = line.choices[0].delta!;
      prev += msg.content || '';
      return prev;
    }, '');
};
