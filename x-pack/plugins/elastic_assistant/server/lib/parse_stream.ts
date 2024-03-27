/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { finished } from 'stream/promises';

type StreamParser = (responseStream: Readable) => Promise<string>;

export const handleStreamStorage: (
  responseStream: Readable,
  llmType: string,
  onMessageSent?: (content: string) => void
) => Promise<void> = async (responseStream, llmType, onMessageSent) => {
  try {
    const parser = llmType === '.bedrock' ? parseBedrockStream : parseOpenAIStream;
    // TODO @steph add abort signal
    const parsedResponse = await parser(responseStream);
    if (onMessageSent) {
      onMessageSent(parsedResponse);
    }
  } catch (e) {
    if (onMessageSent) {
      onMessageSent(`An error occurred while streaming the response:\n\n${e.message}`);
    }
  }
};

const parseOpenAIStream: StreamParser = async (stream) => {
  let responseBody = '';
  stream.on('data', (chunk) => {
    responseBody += chunk.toString();
  });
  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(parseOpenAIResponse(responseBody));
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
};

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
      const msg = line.choices[0].delta;
      return prev + (msg.content || '');
    }, '');

const parseBedrockStream: StreamParser = async (responseStream) => {
  const responseBuffer: Uint8Array[] = [];
  responseStream.on('data', (chunk) => {
    // special encoding for bedrock, do not attempt to convert to string
    responseBuffer.push(chunk);
  });
  await finished(responseStream);

  return parseBedrockBuffer(responseBuffer);
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
