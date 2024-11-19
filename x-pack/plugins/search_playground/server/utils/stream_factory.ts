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

import { PassThrough } from 'stream';

import type { Logger } from '@kbn/logging';
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
  push: (d: string, drain?: boolean) => void;
  responseWithHeaders: StreamResponseWithHeaders;
}

/**
 * Sets up a response stream with support for gzip compression depending on provided
 * request headers. Any non-string data pushed to the stream will be streamed as NDJSON.
 *
 * @param logger - Kibana logger.
 * @param isCloud - Adds an attribute with a random string payload to overcome buffer flushing with certain proxy configurations.
 *
 * @returns An object with stream attributes and methods.
 */
export function streamFactory(logger: Logger, isCloud: boolean = false): StreamFactoryReturnType {
  const stream = new PassThrough();

  const cloudProxyBufferSize = 4096;

  const flushPayload = isCloud
    ? DELIMITER + '10: "' + repeat('0', cloudProxyBufferSize * 2) + '"' + DELIMITER
    : undefined;
  let currentBufferSize = 0;

  const flushBufferIfNeeded = () => {
    if (currentBufferSize && currentBufferSize <= cloudProxyBufferSize) {
      push(flushPayload as unknown as string);
      currentBufferSize = 0;
    }
  };

  const flushIntervalId = setInterval(flushBufferIfNeeded, 250);

  // If waiting for draining of the stream, items will be added to this buffer.
  const backPressureBuffer: string[] = [];

  // Flag will be set when the "drain" listener is active so we can avoid setting multiple listeners.
  let waitForDrain = false;

  // Instead of a flag this is an array where we check if we are waiting on any callback from writing to the stream.
  // It needs to be an array to avoid running into race conditions.
  const waitForCallbacks: number[] = [];

  // Flag to set if the stream should be ended. Because there could be items in the backpressure buffer, we might
  // not want to end the stream right away. Once the backpressure buffer is cleared, we'll end the stream eventually.
  let tryToEnd = false;

  function logDebugMessage(msg: string) {
    logger.debug(`HTTP Response Stream: ${msg}`);
  }

  function end() {
    tryToEnd = true;

    logDebugMessage(`backPressureBuffer size on end(): ${backPressureBuffer.length}`);
    logDebugMessage(`waitForCallbacks size on end(): ${waitForCallbacks.length}`);

    clearInterval(flushIntervalId);
    logDebugMessage(`cleared flush interval`);

    // Before ending the stream, we need to empty the backPressureBuffer
    if (backPressureBuffer.length > 0) {
      const el = backPressureBuffer.shift();
      if (el !== undefined) {
        push(el, true);
      }
      return;
    }

    if (waitForCallbacks.length === 0) {
      logDebugMessage('All backPressureBuffer and waitForCallbacks cleared, ending the stream.');
      stream.end();
    }
  }

  function push(line: string, drain = false) {
    logDebugMessage(
      `Push to stream. Current backPressure buffer size: ${backPressureBuffer.length}, drain flag: ${drain}`
    );

    if (line === undefined) {
      logger.error('Stream chunk must not be undefined.');
      return;
    }

    if ((!drain && waitForDrain) || (!drain && backPressureBuffer.length > 0)) {
      logDebugMessage('Adding item to backpressure buffer.');
      backPressureBuffer.push(line);
      return;
    }

    try {
      waitForCallbacks.push(1);
      const writeOk = stream.write(line, () => {
        waitForCallbacks.pop();

        if (tryToEnd && waitForCallbacks.length === 0) {
          end();
        }
      });

      logDebugMessage(`Ok to write to the stream again? ${writeOk}`);

      // if the buffer size is less than the cloud proxy buffer size, we can add the size of the current line to the buffer size
      currentBufferSize =
        currentBufferSize <= cloudProxyBufferSize
          ? JSON.stringify(line).length + currentBufferSize
          : cloudProxyBufferSize;

      if (!writeOk) {
        logDebugMessage(`Should we add the "drain" listener?: ${!waitForDrain}`);
        if (!waitForDrain) {
          waitForDrain = true;
          stream.once('drain', () => {
            logDebugMessage(
              'The "drain" listener triggered, we can continue pushing to the stream.'
            );

            waitForDrain = false;
            if (backPressureBuffer.length > 0) {
              const el = backPressureBuffer.shift();
              if (el !== undefined) {
                push(el, true);
              }
            }
          });
        }
      } else if (writeOk && drain && backPressureBuffer.length > 0) {
        logDebugMessage('Continue clearing the backpressure buffer.');
        const el = backPressureBuffer.shift();
        if (el !== undefined) {
          push(el, true);
        }
      }
    } catch (e) {
      logger.error(`Could not serialize or stream data chunk: ${e.toString()}`);
      return;
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
