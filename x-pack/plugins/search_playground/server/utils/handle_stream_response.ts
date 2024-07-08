/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamFactory } from '@kbn/ml-response-stream/server';
import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
