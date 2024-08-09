/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// adapted from @kbn/ml-response-stream with the following changes:
// - removed gzip compression
// - removed support for ndjson
// - improved the cloud proxy buffer to work for our use case (works for newline string chunks vs ndjson only)

import type { Logger } from '@kbn/core/server';

import { PassThrough } from 'stream';

import type { ResponseHeaders } from '@kbn/core-http-server';
import { repeat } from 'lodash';

const DELIMITER = `
`;

export interface StreamResponseWithHeaders {
  body: PassThrough;
  headers?: ResponseHeaders;
}

export interface StreamFactoryReturnType {
  DELIMITER: string;
  end: () => void;
  push: (d: string) => void;
  responseWithHeaders: StreamResponseWithHeaders;
}

export function streamFactory(logger: Logger, flushFix: boolean = true): StreamFactoryReturnType {
  const cloudProxyBufferSize = 4096;

  const flushPayload = flushFix
    ? DELIMITER + '10: "' + repeat('0', cloudProxyBufferSize * 2) + '"' + DELIMITER
    : undefined;
  let currentBufferSize = 0;

  const stream = new PassThrough();
  const backPressureBuffer: string[] = [];
  let tryToEnd = false;

  const flushBufferIfNeeded = () => {
    if (currentBufferSize && currentBufferSize <= cloudProxyBufferSize) {
      push(flushPayload as unknown as string);
      currentBufferSize = 0;
    }
  };

  const flushIntervalId = setInterval(flushBufferIfNeeded, 250);

  function end() {
    tryToEnd = true;
    clearInterval(flushIntervalId);

    if (backPressureBuffer.length > 0) {
      const el = backPressureBuffer.shift();
      if (el !== undefined) {
        push(el);
      }
      return;
    }

    stream.end();
  }

  function push(d: string) {
    if (d === undefined) {
      logger.error('Stream chunk must not be undefined.');
      return;
    }

    if (backPressureBuffer.length > 0) {
      backPressureBuffer.push(d);
      return;
    }

    if (tryToEnd) {
      return;
    }

    try {
      const line = d as unknown as string;
      const writeOk = stream.write(line);

      currentBufferSize =
        currentBufferSize <= cloudProxyBufferSize
          ? JSON.stringify(line).length + currentBufferSize
          : cloudProxyBufferSize;

      if (!writeOk) {
        backPressureBuffer.push(d);
      }
    } catch (e) {
      logger.error(`Could not serialize or stream data chunk: ${e.toString()}`);
    }
  }

  const responseWithHeaders: StreamResponseWithHeaders = {
    body: stream,
    headers: {
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  };

  return { DELIMITER, end, push, responseWithHeaders };
}
