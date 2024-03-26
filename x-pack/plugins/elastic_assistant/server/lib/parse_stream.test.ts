/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';
import { handleStreamStorage } from './parse_stream';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: unknown) => {
      transform.push(data);
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
const onMessageSent = jest.fn();
describe('handleStreamStorage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  let stream: ReturnType<typeof createStreamMock>;

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

  describe('OpenAI stream', () => {
    beforeEach(() => {
      stream = createStreamMock();
      stream.write(`data: ${JSON.stringify(chunk)}`);
    });

    it('saves the final string successful streaming event', async () => {
      stream.complete();
      await handleStreamStorage(stream.transform, '.gen-ai', onMessageSent);
      expect(onMessageSent).toHaveBeenCalledWith('Single.');
    });
    it('saves the error message on a failed streaming event', async () => {
      const tokenPromise = handleStreamStorage(stream.transform, '.gen-ai', onMessageSent);

      stream.fail();
      await expect(tokenPromise).resolves.not.toThrow();
      expect(onMessageSent).toHaveBeenCalledWith(
        `An error occurred while streaming the response:\n\nStream failed`
      );
    });
  });
  describe('Bedrock stream', () => {
    beforeEach(() => {
      stream = createStreamMock();
      stream.write(encodeBedrockResponse('Simple.'));
    });

    it('saves the final string successful streaming event', async () => {
      stream.complete();
      await handleStreamStorage(stream.transform, '.bedrock', onMessageSent);
      expect(onMessageSent).toHaveBeenCalledWith('Simple.');
    });
    it('saves the error message on a failed streaming event', async () => {
      const tokenPromise = handleStreamStorage(stream.transform, '.bedrock', onMessageSent);

      stream.fail();
      await expect(tokenPromise).resolves.not.toThrow();
      expect(onMessageSent).toHaveBeenCalledWith(
        `An error occurred while streaming the response:\n\nStream failed`
      );
    });
  });
});

function encodeBedrockResponse(completion: string) {
  return new EventStreamCodec(toUtf8, fromUtf8).encode({
    headers: {},
    body: Uint8Array.from(
      Buffer.from(
        JSON.stringify({
          bytes: Buffer.from(JSON.stringify({ completion })).toString('base64'),
        })
      )
    ),
  });
}
