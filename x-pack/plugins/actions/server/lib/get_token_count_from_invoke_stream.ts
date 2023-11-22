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

  const responseBuffer: Uint8Array[] = [];

  const isBedrock = actionTypeId === '.bedrock';

  responseStream.on('data', (chunk) => {
    if (isBedrock) {
      // special encoding for bedrock, do not attempt to convert to string
      responseBuffer.push(chunk);
    } else {
      // no special encoding, can safely use toString and append to responseBody
      responseBody += chunk.toString();
    }
  });
  try {
    await finished(responseStream);
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
  }

  // parse openai response once responseBody is fully built
  // They send the response in sometimes incomplete chunks of JSON
  const parsedResponse = isBedrock
    ? parseBedrockBuffer(responseBuffer)
    : parseOpenAIResponse(responseBody);

  const completionTokens = encode(parsedResponse).length;
  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}

const parseBedrockBuffer = (chunks: Uint8Array[]) => {
  let bedrockBuffer: Uint8Array = new Uint8Array(0);
  return chunks
    .map((chunk) => {
      bedrockBuffer = concatChunks(bedrockBuffer, chunk);
      let messageLength = getMessageLength(bedrockBuffer);

      const buildChunks = [];
      while (bedrockBuffer.byteLength > 0 && bedrockBuffer.byteLength >= messageLength) {
        const extractedChunk = bedrockBuffer.slice(0, messageLength);
        buildChunks.push(extractedChunk);
        bedrockBuffer = bedrockBuffer.slice(messageLength);
        messageLength = getMessageLength(bedrockBuffer);
      }

      const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);

      return buildChunks
        .map((bChunk) => {
          const event = awsDecoder.decode(bChunk);
          const body = JSON.parse(
            Buffer.from(JSON.parse(new TextDecoder().decode(event.body)).bytes, 'base64').toString()
          );
          return body.completion;
        })
        .join('');
    })
    .join('');
};

function concatChunks(a: Uint8Array, b: Uint8Array) {
  const newBuffer = new Uint8Array(a.length + b.length);
  newBuffer.set(a);
  newBuffer.set(b, a.length);
  return newBuffer;
}

function getMessageLength(buffer: Uint8Array) {
  if (buffer.byteLength === 0) return 0;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  return view.getUint32(0, false);
}

const parseOpenAIResponse = (responseBody: string) =>
  responseBody
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
