/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import zlib from 'zlib';

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';

import { API_ENDPOINT } from '../../common/api';
import type { ApiEndpointActions } from '../../common/api';

import { streamFactory } from './stream_factory';

type Action = ApiEndpointActions['/internal/aiops/explain_log_rate_spikes'];

const mockItem1: Action = {
  type: 'add_fields',
  payload: ['clientip'],
};
const mockItem2: Action = {
  type: 'add_fields',
  payload: ['referer'],
};

describe('streamFactory', () => {
  let mockLogger: MockedLogger;

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });

  it('should encode and receive an uncompressed stream', async () => {
    const { DELIMITER, end, push, responseWithHeaders, stream } = streamFactory<
      typeof API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES
    >(mockLogger, {});

    push(mockItem1);
    push(mockItem2);
    end();

    let streamResult = '';
    for await (const chunk of stream) {
      streamResult += chunk.toString('utf8');
    }

    const streamItems = streamResult.split(DELIMITER);
    const lastItem = streamItems.pop();

    const parsedItems = streamItems.map((d) => JSON.parse(d));

    expect(responseWithHeaders.headers).toBe(undefined);
    expect(parsedItems).toHaveLength(2);
    expect(parsedItems[0]).toStrictEqual(mockItem1);
    expect(parsedItems[1]).toStrictEqual(mockItem2);
    expect(lastItem).toBe('');
  });

  // Because zlib.gunzip's API expects a callback, we need to use `done` here
  // to indicate once all assertions are run. However, it's not allowed to use both
  // `async` and `done` for the test callback. That's why we're using an "async IIFE"
  // pattern inside the tests callback to still be able to do async/await for the
  // `for await()` part. Note that the unzipping here is done just to be able to
  // decode the stream for the test and assert it. When used in actual code,
  // the browser on the client side will automatically take care of unzipping
  // without the need for additional custom code.
  it('should encode and receive a compressed stream', (done) => {
    (async () => {
      const { DELIMITER, end, push, responseWithHeaders, stream } = streamFactory<
        typeof API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES
      >(mockLogger, { 'accept-encoding': 'gzip' });

      push(mockItem1);
      push(mockItem2);
      end();

      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      zlib.gunzip(buffer, function (err, decoded) {
        expect(err).toBe(null);

        const streamResult = decoded.toString('utf8');

        const streamItems = streamResult.split(DELIMITER);
        const lastItem = streamItems.pop();

        const parsedItems = streamItems.map((d) => JSON.parse(d));

        expect(responseWithHeaders.headers).toStrictEqual({ 'content-encoding': 'gzip' });
        expect(parsedItems).toHaveLength(2);
        expect(parsedItems[0]).toStrictEqual(mockItem1);
        expect(parsedItems[1]).toStrictEqual(mockItem2);
        expect(lastItem).toBe('');

        done();
      });
    })();
  });
});
