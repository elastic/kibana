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
  signal?: AbortSignal;
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
  const { signal, ...chatCompletionRequest } = body;

  const parser = actionTypeId === '.bedrock' ? parseBedrockStream : parseOpenAIStream;
  const parsedResponse = await parser(responseStream, logger, signal);
  if (typeof parsedResponse === 'string') {
    // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
    const promptTokens = encode(
      chatCompletionRequest.messages
        .map((msg) => `<|start|>${msg.role}\n${msg.content}<|end|>`)
        .join('\n')
    ).length;

    const completionTokens = encode(parsedResponse).length;
    return {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
    };
  }
  // if parsed response is not a string, it is the usage object
  return parsedResponse;
}

type StreamParser = (
  responseStream: Readable,
  logger: Logger,
  signal?: AbortSignal
) => Promise<
  | {
      total: number;
      prompt: number;
      completion: number;
    }
  | string
>;

const parseBedrockStream: StreamParser = async (responseStream, logger) => {
  const responseBuffer: Uint8Array[] = [];
  // do not destroy response stream on abort for bedrock
  // Amazon charges the same tokens whether the stream is destroyed or not, so let it finish to calculate
  responseStream.on('data', (chunk) => {
    // special encoding for bedrock, do not attempt to convert to string
    responseBuffer.push(chunk);
  });
  try {
    await finished(responseStream);
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
  }
  const usage = getUsageFromFinalChunk(responseBuffer[responseBuffer.length - 1], logger);
  if (usage) {
    return usage;
  }
  return parseBedrockBuffer(responseBuffer);
};

const parseOpenAIStream: StreamParser = async (responseStream, logger, signal) => {
  let responseBody: string = '';
  const destroyStream = () => {
    // Pause the stream to prevent further data events
    responseStream.pause();
    // Remove the 'data' event listener once the stream is paused
    responseStream.removeListener('data', onData);
    // Manually destroy the stream
    responseStream.emit('close');
    responseStream.destroy();
  };

  const onData = (chunk: Buffer) => {
    // no special encoding, can safely use `${chunk}` and append to responseBody
    responseBody += `${chunk}`;
  };

  responseStream.on('data', onData);

  try {
    // even though the stream is destroyed in the axios request, the response body is still calculated
    // if we do not destroy the stream, the response never resolves
    signal?.addEventListener('abort', destroyStream);
    await finished(responseStream);
  } catch (e) {
    if (!signal?.aborted)
      logger.error('An error occurred while calculating streaming response tokens');
  }
  return parseOpenAIResponse(responseBody);
};

/**
 * Parses a Bedrock buffer from an array of chunks.
 *
 * @param {Uint8Array[]} chunks - Array of Uint8Array chunks to be parsed.
 * @returns {string} - Parsed string from the Bedrock buffer.
 */
const parseBedrockBuffer = (chunks: Uint8Array[]): string => {
  // Initialize an empty Uint8Array to store the concatenated buffer.
  let bedrockBuffer: Uint8Array = new Uint8Array(0);
  // Map through each chunk to process the Bedrock buffer.
  return chunks
    .map((chunk) => {
      // Concatenate the current chunk to the existing buffer.
      bedrockBuffer = concatChunks(bedrockBuffer, chunk);
      // Get the length of the next message in the buffer.
      let messageLength = getMessageLength(bedrockBuffer);
      // Initialize an array to store fully formed message chunks.
      const buildChunks = [];
      // Process the buffer until no complete messages are left.
      while (bedrockBuffer.byteLength > 0 && bedrockBuffer.byteLength >= messageLength) {
        // Extract a chunk of the specified length from the buffer.
        const extractedChunk = bedrockBuffer.slice(0, messageLength);
        // Add the extracted chunk to the array of fully formed message chunks.
        buildChunks.push(extractedChunk);
        // Remove the processed chunk from the buffer.
        bedrockBuffer = bedrockBuffer.slice(messageLength);
        // Get the length of the next message in the updated buffer.
        messageLength = getMessageLength(bedrockBuffer);
      }

      const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);

      // Decode and parse each message chunk, extracting the 'completion' property.
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

/**
 * Concatenates two Uint8Array buffers.
 *
 * @param {Uint8Array} a - First buffer.
 * @param {Uint8Array} b - Second buffer.
 * @returns {Uint8Array} - Concatenated buffer.
 */
function concatChunks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const newBuffer = new Uint8Array(a.length + b.length);
  // Copy the contents of the first buffer to the new buffer.
  newBuffer.set(a);
  // Copy the contents of the second buffer to the new buffer starting from the end of the first buffer.
  newBuffer.set(b, a.length);
  return newBuffer;
}

/**
 * Gets the length of the next message from the buffer.
 *
 * @param {Uint8Array} buffer - Buffer containing the message.
 * @returns {number} - Length of the next message.
 */
function getMessageLength(buffer: Uint8Array): number {
  // If the buffer is empty, return 0.
  if (buffer.byteLength === 0) return 0;
  // Create a DataView to read the Uint32 value at the beginning of the buffer.
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  // Read and return the Uint32 value (message length).
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

/**
 * Parses the final chunk of a Bedrock buffer to extract the usage object.
 * @param finalChunk
 */
const getUsageFromFinalChunk = (
  finalChunk: Uint8Array,
  logger: Logger
): {
  total: number;
  prompt: number;
  completion: number;
} | null => {
  const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);
  const event = awsDecoder.decode(finalChunk);
  const body = JSON.parse(
    Buffer.from(JSON.parse(new TextDecoder().decode(event.body)).bytes, 'base64').toString()
  );
  if (body.type === 'message_stop') {
    if (
      body['amazon-bedrock-invocationMetrics'] &&
      body['amazon-bedrock-invocationMetrics'].inputTokenCount != null &&
      body['amazon-bedrock-invocationMetrics'].outputTokenCount != null
    ) {
      return {
        total:
          body['amazon-bedrock-invocationMetrics'].inputTokenCount +
          body['amazon-bedrock-invocationMetrics'].outputTokenCount,
        prompt: body['amazon-bedrock-invocationMetrics'].inputTokenCount,
        completion: body['amazon-bedrock-invocationMetrics'].outputTokenCount,
      };
    }
    logger.error(
      'Response from Bedrock invoke stream message_stop chunk did not contain amazon-bedrock-invocationMetrics'
    );
    return {
      total: 0,
      prompt: 0,
      completion: 0,
    };
  }
  return null;
};
