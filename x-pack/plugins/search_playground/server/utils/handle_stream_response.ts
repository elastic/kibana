/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

import { PassThrough } from 'stream';

import type { Headers, ResponseHeaders } from '@kbn/core-http-server';
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

export function streamFactory(
  headers: Headers,
  logger: Logger,
  flushFix: boolean = true
): StreamFactoryReturnType {
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
      ...headers,
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  };

  return { DELIMITER, end, push, responseWithHeaders };
}

export const handleStreamResponse = async ({
  stream,
  request,
  response,
  logger,
  maxTimeoutMs = 250,
}: {
  stream: ReadableStream;
  logger: Logger;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  maxTimeoutMs?: number;
}) => {
  const { end, push, responseWithHeaders } = streamFactory(request.headers, logger);
  const reader = (stream as ReadableStream).getReader();
  const textDecoder = new TextDecoder();

  let handleStopRequest = false;
  request.events.aborted$.subscribe(() => {
    handleStopRequest = true;
  });
  request.events.completed$.subscribe(() => {
    handleStopRequest = true;
  });

  async function pushStreamUpdate() {
    try {
      const { done, value }: { done: boolean; value?: Uint8Array } = await reader.read();

      if (done || handleStopRequest) {
        end();
        return;
      }

      let decodedValue;
      try {
        decodedValue = textDecoder.decode(value);
      } catch (e) {
        decodedValue = '';
        logger.error(`Could not decode the data: ${e.toString()}`);
      }

      push(decodedValue);

      await timeout(Math.floor(Math.random() * maxTimeoutMs));

      void pushStreamUpdate();
    } catch (e) {
      logger.error(`There was an error: ${e.toString()}`);
    }
  }

  void pushStreamUpdate();

  return response.ok(responseWithHeaders);
};
