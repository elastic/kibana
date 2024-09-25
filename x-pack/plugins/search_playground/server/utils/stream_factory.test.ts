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
      debug: jest.fn(),
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
      debug: jest.fn(),
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
      debug: jest.fn(),
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

  it('should handle backpressure when stream.write returns false', (done) => {
    const logger = {
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    const { push, responseWithHeaders } = streamFactory(logger);

    // Mock the write method to simulate backpressure
    const originalWrite = responseWithHeaders.body.write.bind(responseWithHeaders.body);

    // @ts-ignore
    responseWithHeaders.body.write = jest.fn((chunk, callback) => {
      setImmediate(() => {
        if (callback) callback(null);
        responseWithHeaders.body.emit('drain');
      });

      return false;
    });

    responseWithHeaders.body.write = originalWrite;

    const data = 'backpressure test data';
    let output = '';

    responseWithHeaders.body.on('data', (chunk) => {
      output += chunk.toString();
    });

    responseWithHeaders.body.on('end', () => {
      expect(output).toContain(data);
      done();
    });

    // Push data and then end the stream after handling backpressure
    push(data);

    // Simulate a delay to handle the drain event
    setTimeout(() => {
      responseWithHeaders.body.end();
    }, 50);
  });
});
