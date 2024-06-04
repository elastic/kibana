/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { Logger } from '@kbn/core/server';
import { parseBedrockStream } from '@kbn/langchain/server';

type StreamParser = (
  responseStream: Readable,
  logger: Logger,
  abortSignal?: AbortSignal,
  tokenHandler?: (token: string) => void
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
    const parser =
      actionTypeId === '.bedrock'
        ? parseBedrockStream
        : actionTypeId === '.gemini'
        ? parseGeminiStream
        : parseOpenAIStream;
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

export const parseGeminiStream: StreamParser = async (stream, logger, abortSignal) => {
  let responseBody = '';
  stream.on('data', (chunk) => {
    responseBody += chunk.toString();
  });
  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(parseGeminiResponse(responseBody));
    });
    stream.on('error', (err) => {
      reject(err);
    });
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        stream.destroy();
        resolve(parseGeminiResponse(responseBody));
      });
    }
  });
};

/** Parse Gemini stream response body */
export const parseGeminiResponse = (responseBody: string) => {
  return responseBody
    .split('\n')
    .filter((line) => line.startsWith('data: ') && !line.endsWith('[DONE]'))
    .map((line) => JSON.parse(line.replace('data: ', '')))
    .filter(
      (
        line
      ): line is {
        candidates: Array<{
          content: { role: string; parts: Array<{ text: string }> };
          finishReason: string;
          safetyRatings: Array<{ category: string; probability: string }>;
        }>;
        usageMetadata: {
          promptTokenCount: number;
          candidatesTokenCount: number;
          totalTokenCount: number;
        };
      } => 'candidates' in line
    )
    .reduce((prev, line) => {
      if (line.candidates[0] && line.candidates[0].content) {
        const parts = line.candidates[0].content.parts;
        const text = parts.map((part) => part.text).join('');
        return prev + text;
      }
      return prev;
    }, '');
};
