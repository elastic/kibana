/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';

import { streamFactory } from './stream_factory';

export const handleStreamResponse = async ({
  stream,
  request,
  response,
  logger,
  isCloud = false,
}: {
  stream: ReadableStream;
  logger: Logger;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  maxTimeoutMs?: number;
  isCloud?: boolean;
}) => {
  const { end, push, responseWithHeaders } = streamFactory(logger, isCloud);
  const reader = stream.getReader();
  const textDecoder = new TextDecoder();

  const abortController = new AbortController();

  request.events.aborted$.subscribe(() => {
    abortController.abort();
  });
  request.events.completed$.subscribe(() => {
    abortController.abort();
  });

  async function pushStreamUpdate() {
    try {
      const { done, value }: { done: boolean; value?: Uint8Array } = await reader.read();
      if (done || abortController.signal.aborted) {
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

      void pushStreamUpdate();
    } catch (error) {
      logger.error(`Error occurred while pushing the next chunk: ${error.toString()}`);
      end();
      abortController.abort();
      throw error;
    }
  }

  try {
    void pushStreamUpdate();
  } catch (error) {
    logger.error('Failed to push stream update', error);
    throw error;
  }

  return response.ok(responseWithHeaders);
};
