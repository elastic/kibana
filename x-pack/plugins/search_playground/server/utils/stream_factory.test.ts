/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamFactory } from './stream_factory';
import { Logger } from '@kbn/logging';
import { PassThrough } from 'stream';

describe('streamFactory', () => {
  it('should create a stream with the correct initial state', () => {
    const logger = {
      error: jest.fn(),
    } as unknown as Logger;

    const { DELIMITER, responseWithHeaders } = streamFactory(logger);

    expect(DELIMITER).toBe('\n');
    expect(responseWithHeaders.headers).toEqual({
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });
    expect(responseWithHeaders.body).toBeInstanceOf(PassThrough);
  });

  it('should push data to the stream correctly', () => {
    const logger = {
      error: jest.fn(),
    } as unknown as Logger;

    const { push, responseWithHeaders } = streamFactory(logger);

    const data = 'test data';
    push(data);

    let output = '';
    responseWithHeaders.body.on('data', (chunk) => {
      output += chunk.toString();
    });

    responseWithHeaders.body.end(() => {
      expect(output).toContain(data);
    });
  });

  it('should handle flush buffer mechanism', () => {
    const logger = {
      error: jest.fn(),
    } as unknown as Logger;

    const { push, responseWithHeaders } = streamFactory(logger);

    const data = 'short';
    push(data);

    let output = '';
    responseWithHeaders.body.on('data', (chunk) => {
      output += chunk.toString();
    });

    responseWithHeaders.body.end(() => {
      expect(output).toContain(data);
    });
  });
});
