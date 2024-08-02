/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleStreamResponse } from './handle_stream_response';

jest.mock('./stream_factory', () => ({
  streamFactory: jest.fn().mockReturnValue({
    end: jest.fn(),
    push: jest.fn(),
    responseWithHeaders: jest.fn(),
  }),
}));

describe('handleStreamResponse', () => {
  const logger = {
    error: jest.fn(),
  };
  const response = {
    ok: jest.fn(() => ({ status: 'ok' })),
  };
  let request: {
    events: { aborted$: { subscribe: jest.Mock }; completed$: { subscribe: jest.Mock } };
    headers: {};
  };
  let stream: { getReader: jest.Mock };

  beforeEach(() => {
    logger.error.mockClear();
    response.ok.mockClear();
    request = {
      events: {
        aborted$: {
          subscribe: jest.fn(),
        },
        completed$: {
          subscribe: jest.fn(),
        },
      },
      headers: {},
    };
    stream = {
      getReader: jest.fn(),
    };
  });

  it('should handle stream correctly', async () => {
    expect.assertions(3);
    const data = ['Hello', 'World'];
    const reader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(data[0]) })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(data[1]) })
        .mockResolvedValueOnce({ done: true }),
    };

    stream.getReader.mockReturnValue(reader);

    // @ts-ignore
    await handleStreamResponse({ stream, request, response, logger, maxTimeoutMs: 0 });
    await new Promise((r) => setTimeout(r, 100));
    expect(reader.read).toHaveBeenCalledTimes(3);
    expect(response.ok).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle decoding errors', async () => {
    expect.assertions(3);
    // @ts-ignore
    jest.spyOn(global, 'TextDecoder').mockImplementation(() => ({
      decode: jest.fn(() => {
        throw new Error('Test error');
      }),
    }));
    const reader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({ done: false, value: null })
        .mockResolvedValueOnce({ done: true }),
    };

    stream.getReader.mockReturnValue(reader);

    // @ts-ignore
    await handleStreamResponse({ stream, request, response, logger, maxTimeoutMs: 0 });
    await new Promise((r) => setTimeout(r, 100));

    expect(reader.read).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
