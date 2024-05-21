/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable, Transform } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { handleStreamStorage } from './parse_stream';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { parseGeminiStream, parseGeminiResponse } from './parse_stream';

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
const mockLogger = loggerMock.create();
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
  let defaultProps = {
    responseStream: jest.fn() as unknown as Readable,
    actionTypeId: '.gen-ai',
    onMessageSent,
    logger: mockLogger,
  };

  describe('OpenAI stream', () => {
    beforeEach(() => {
      stream = createStreamMock();
      stream.write(`data: ${JSON.stringify(chunk)}`);
      defaultProps = {
        responseStream: stream.transform,
        actionTypeId: '.gen-ai',
        onMessageSent,
        logger: mockLogger,
      };
    });

    it('saves the final string successful streaming event', async () => {
      stream.complete();
      await handleStreamStorage(defaultProps);
      expect(onMessageSent).toHaveBeenCalledWith('Single.');
    });
    it('saves the error message on a failed streaming event', async () => {
      const tokenPromise = handleStreamStorage(defaultProps);

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
      defaultProps = {
        responseStream: stream.transform,
        actionTypeId: '.gen-ai',
        onMessageSent,
        logger: mockLogger,
      };
    });

    it('saves the final string successful streaming event', async () => {
      stream.complete();
      await handleStreamStorage({ ...defaultProps, actionTypeId: '.bedrock' });
      expect(onMessageSent).toHaveBeenCalledWith('Simple.');
    });
    it('saves the error message on a failed streaming event', async () => {
      const tokenPromise = handleStreamStorage({ ...defaultProps, actionTypeId: '.bedrock' });

      stream.fail();
      await expect(tokenPromise).resolves.not.toThrow();
      expect(onMessageSent).toHaveBeenCalledWith(
        `An error occurred while streaming the response:\n\nStream failed`
      );
    });
  });


describe('parseGeminiStream', () => {
  let mockStream: Readable;
  let mockLogger: any;
  let mockAbortSignal: AbortSignal;

  beforeEach(() => {
    mockStream = new Readable();
    mockLogger = { info: jest.fn() };
    mockAbortSignal = new AbortController().signal;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should parse Gemini stream successfully', async () => {
    const chunks = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"World"}]}}]}\n',
    ];

    const expectedParsedResponse = 'HelloWorld';
    const parseGeminiResponseMock = jest.fn().mockReturnValue(expectedParsedResponse);
    (parseGeminiResponse as jest.MockedFunction<typeof parseGeminiResponse>).mockImplementationOnce(parseGeminiResponseMock);

    // Simulate data chunks and end of stream
    setTimeout(() => {
      chunks.forEach(chunk => mockStream.push(chunk));
      mockStream.push(null); // Signal end of stream
    }, 0);

    const parsedResponse = await parseGeminiStream(mockStream, mockLogger);
    expect(parseGeminiResponseMock).toHaveBeenCalledWith(chunks.join(''));
    expect(parsedResponse).toBe(expectedParsedResponse);
  });

  it('should handle errors during streaming', async () => {
    const errorMessage = 'Stream error';
    setTimeout(() => {
      mockStream.emit('error', new Error(errorMessage));
    }, 0);

    await expect(parseGeminiStream(mockStream, mockLogger)).rejects.toThrowError(errorMessage);
  });

  it('should resolve with partial response if aborted', async () => {
    const chunks = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"World"}]}}]}\n',
    ];

    const expectedParsedResponse = 'Hello';
    const parseGeminiResponseMock = jest.fn().mockReturnValue(expectedParsedResponse);
    (parseGeminiResponse as jest.MockedFunction<typeof parseGeminiResponse>).mockImplementationOnce(parseGeminiResponseMock);

    // Simulate data chunks and abort
    setTimeout(() => {
      mockStream.push(chunks[0]);
      mockAbortSignal.dispatchEvent(new Event('abort'));
    }, 0);

    const parsedResponse = await parseGeminiStream(mockStream, mockLogger, mockAbortSignal);
    expect(parseGeminiResponseMock).toHaveBeenCalledWith(chunks[0]);
    expect(parsedResponse).toBe(expectedParsedResponse);
  });
});

});

function encodeBedrockResponse(completion: string) {
  return new EventStreamCodec(toUtf8, fromUtf8).encode({
    headers: {},
    body: Uint8Array.from(
      Buffer.from(
        JSON.stringify({
          bytes: Buffer.from(
            JSON.stringify({
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: completion },
            })
          ).toString('base64'),
        })
      )
    ),
  });
}
