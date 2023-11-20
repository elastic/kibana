/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';
import { getTokenCountFromInvokeStream } from './get_token_count_from_invoke_stream';
import { loggerMock } from '@kbn/logging-mocks';

interface StreamMock {
  write: (data: string) => void;
  fail: () => void;
  complete: () => void;
  transform: Transform;
}

function createStreamMock(): StreamMock {
  const transform: Transform = new Transform({});

  return {
    write: (data: string) => {
      transform.push(`${data}\n`);
    },
    fail: () => {
      transform.emit('error', new Error('Stream failed'));
      transform.end();
    },
    transform,
    complete: () => {
      transform.end();
    },
  };
}
const logger = loggerMock.create();
describe('getTokenCountFromInvokeStream', () => {
  let stream: StreamMock;
  const body = {
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

  const PROMPT_TOKEN_COUNT = 34;
  const COMPLETION_TOKEN_COUNT = 2;

  beforeEach(() => {
    stream = createStreamMock();
    stream.write('Single');
  });

  describe('when a stream completes', () => {
    beforeEach(async () => {
      stream.complete();
    });
    it('counts the prompt tokens', async () => {
      const tokens = await getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
      });
      expect(tokens.prompt).toBe(PROMPT_TOKEN_COUNT);
      expect(tokens.completion).toBe(COMPLETION_TOKEN_COUNT);
      expect(tokens.total).toBe(PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT);
    });
  });

  describe('when a stream fails', () => {
    it('resolves the promise with the correct prompt tokens', async () => {
      const tokenPromise = getTokenCountFromInvokeStream({
        responseStream: stream.transform,
        body,
        logger,
      });

      stream.fail();

      await expect(tokenPromise).resolves.toEqual({
        prompt: PROMPT_TOKEN_COUNT,
        total: PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT,
        completion: COMPLETION_TOKEN_COUNT,
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
