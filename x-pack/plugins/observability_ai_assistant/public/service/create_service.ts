/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpResponse } from '@kbn/core/public';
import { filter, map } from 'rxjs';
import type { Message } from '../../common';
import { createCallObservabilityAIAssistantAPI } from '../api';
import { CreateChatCompletionResponseChunk, ObservabilityAIAssistantService } from '../types';
import { readableStreamReaderIntoObservable } from '../utils/readable_stream_reader_into_observable';

export function createService(coreStart: CoreStart): ObservabilityAIAssistantService {
  const client = createCallObservabilityAIAssistantAPI(coreStart);

  return {
    isEnabled: () => {
      return true;
    },
    async chat({
      connectorId,
      messages,
      signal,
    }: {
      connectorId: string;
      messages: Message[];
      signal: AbortSignal;
    }) {
      const response = (await client('POST /internal/observability_ai_assistant/chat', {
        params: {
          body: {
            messages,
            connectorId,
          },
        },
        signal,
        asResponse: true,
        rawResponse: true,
      })) as unknown as HttpResponse;

      const status = response.response?.status;

      if (!status || status >= 400) {
        throw new Error(response.response?.statusText || 'Unexpected error');
      }

      const reader = response.response.body?.getReader();

      if (!reader) {
        throw new Error('Could not get reader from response');
      }

      return readableStreamReaderIntoObservable(reader).pipe(
        map((line) => line.substring(6)),
        filter((line) => !!line && line !== '[DONE]'),
        map((line) => JSON.parse(line) as CreateChatCompletionResponseChunk),
        filter((line) => line.object === 'chat.completion.chunk')
      );
    },
    callApi: client,
  };
}
