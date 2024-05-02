/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { handleBedrockChunk } from '@kbn/elastic-assistant-common';
import { Logger } from '@kbn/core/server';

type StreamParser = (
  responseStream: Readable,
  logger: Logger,
  abortSignal?: AbortSignal
) => Promise<string>;

export const handleStreamStorage = async ({
  abortSignal,
  responseStream,
  actionTypeId,
  onMessageSent,
  logger,
}: {
  abortSignal?: AbortSignal;
  responseStream: Readable;
  actionTypeId: string;
  onMessageSent?: (content: string) => void;
  logger: Logger;
}): Promise<void> => {
  try {
    const parser = actionTypeId === '.bedrock' ? parseBedrockStream : parseOpenAIStream;
    const parsedResponse = await parser(responseStream, logger, abortSignal);
    if (onMessageSent) {
      onMessageSent(parsedResponse);
    }
  } catch (e) {
    if (onMessageSent) {
      onMessageSent(`An error occurred while streaming the response:\n\n${e.message}`);
    }
  }
};

const parseOpenAIStream: StreamParser = async (stream, logger, abortSignal) => {
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
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        stream.destroy();
        resolve(parseOpenAIResponse(responseBody));
      });
    }
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

const parseBedrockStream: StreamParser = async (responseStream, logger, abortSignal) => {
  const responseBuffer: Uint8Array[] = [];
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      responseStream.destroy(new Error('Aborted'));
      return parseBedrockBuffer(responseBuffer, logger);
    });
  }
  responseStream.on('data', (chunk) => {
    // special encoding for bedrock, do not attempt to convert to string
    responseBuffer.push(chunk);
  });

  await finished(responseStream).catch((err) => {
    if (abortSignal?.aborted) {
      logger.info('Bedrock stream parsing was aborted.');
    } else {
      throw err;
    }
  });

  return parseBedrockBuffer(responseBuffer, logger);
};

/**
 * Parses a Bedrock buffer from an array of chunks.
 *
 * @param {Uint8Array[]} chunks - Array of Uint8Array chunks to be parsed.
 * @returns {string} - Parsed string from the Bedrock buffer.
 */
const parseBedrockBuffer = (chunks: Uint8Array[], logger: Logger): string => {
  // Initialize an empty Uint8Array to store the concatenated buffer.
  let bedrockBuffer: Uint8Array = new Uint8Array(0);

  // Map through each chunk to process the Bedrock buffer.
  return chunks
    .map((chunk) => {
      const processedChunk = handleBedrockChunk({ chunk, bedrockBuffer, logger });
      bedrockBuffer = processedChunk.bedrockBuffer;
      return processedChunk.decodedChunk;
    })
    .join('');
};
