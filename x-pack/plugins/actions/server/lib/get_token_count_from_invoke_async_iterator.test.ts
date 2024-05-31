/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getTokenCountFromInvokeAsyncIterator,
  InvokeAsyncIteratorBody,
} from './get_token_count_from_invoke_async_iterator';
import { loggerMock } from '@kbn/logging-mocks';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from 'openai/resources/chat/completions';

const body: InvokeAsyncIteratorBody = {
  messages: [
    {
      role: 'system',
      content: 'This is a system message',
    },
    {
      role: 'user',
      content: 'This is a user message',
    },
  ],
};

const chunk = {
  object: 'chat.completion.chunk',
  choices: [
    {
      delta: {
        content: 'Single.',
      },
    },
  ],
};

export async function* asyncGenerator() {
  // Mock implementation
  yield chunk;
}
export async function* asyncGeneratorWarn() {
  // Mock implementation
  yield chunk;
  yield {
    object: 'chat.completion.chunk',
    choices: [
      {
        delta: {
          content: ['not', 'a', 'string'],
        },
      },
    ],
  };
}

export async function* asyncGeneratorErr() {
  // Mock implementation
  yield chunk;
  throw new Error('wow thats bad');
}

const logger = loggerMock.create();
describe('getTokenCountFromInvokeAsyncIterator', () => {
  let stream: Stream<ChatCompletionChunk>;
  beforeEach(() => {
    jest.resetAllMocks();
    stream = asyncGenerator() as unknown as Stream<ChatCompletionChunk>;
  });
  const PROMPT_TOKEN_COUNT = 36;
  const COMPLETION_TOKEN_COUNT = 2;
  it('counts the prompt + completion tokens for OpenAI response', async () => {
    const tokens = await getTokenCountFromInvokeAsyncIterator({
      streamIterable: stream,
      body,
      logger,
    });
    expect(tokens.prompt).toBe(PROMPT_TOKEN_COUNT);
    expect(tokens.completion).toBe(COMPLETION_TOKEN_COUNT);
    expect(tokens.total).toBe(PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT);
  });
  it('resolves the promise with the correct prompt tokens, and logs a warning when a chunk has an unexpected format', async () => {
    stream = asyncGeneratorWarn() as unknown as Stream<ChatCompletionChunk>;
    const tokenPromise = getTokenCountFromInvokeAsyncIterator({
      streamIterable: stream,
      body,
      logger,
    });

    await expect(tokenPromise).resolves.toEqual({
      prompt: PROMPT_TOKEN_COUNT,
      total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
      completion: COMPLETION_TOKEN_COUNT,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
  it('resolves the promise with the correct prompt tokens, and logs a err when thrown', async () => {
    stream = asyncGeneratorErr() as unknown as Stream<ChatCompletionChunk>;
    const tokenPromise = getTokenCountFromInvokeAsyncIterator({
      streamIterable: stream,
      body,
      logger,
    });

    await expect(tokenPromise).resolves.toEqual({
      prompt: PROMPT_TOKEN_COUNT,
      total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
      completion: COMPLETION_TOKEN_COUNT,
    });
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenNthCalledWith(2, Error('wow thats bad'));
  });
});
