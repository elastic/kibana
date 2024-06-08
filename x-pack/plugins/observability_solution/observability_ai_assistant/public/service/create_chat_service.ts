/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, HttpResponse } from '@kbn/core/public';
import type { IncomingMessage } from 'http';
import {
  catchError,
  concatMap,
  delay,
  filter,
  from,
  map,
  Observable,
  of,
  OperatorFunction,
  scan,
  shareReplay,
  switchMap,
  throwError,
  timestamp,
} from 'rxjs';
import { ChatCompletionChunkEvent, Message, MessageRole } from '../../common';
import {
  StreamingChatResponseEventType,
  type BufferFlushEvent,
  type StreamingChatResponseEvent,
  type StreamingChatResponseEventWithoutError,
} from '../../common/conversation_complete';
import { FunctionRegistry, FunctionResponse } from '../../common/functions/types';
import { filterFunctionDefinitions } from '../../common/utils/filter_function_definitions';
import { throwSerializedChatCompletionErrors } from '../../common/utils/throw_serialized_chat_completion_errors';
import { untilAborted } from '../../common/utils/until_aborted';
import { sendEvent } from '../analytics';
import type {
  ObservabilityAIAssistantAPIClient,
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
} from '../api';
import type {
  ChatRegistrationRenderFunction,
  ObservabilityAIAssistantChatService,
  RenderFunction,
} from '../types';
import { readableStreamReaderIntoObservable } from '../utils/readable_stream_reader_into_observable';
import { complete } from './complete';

const MIN_DELAY = 10;

function toObservable(response: HttpResponse<IncomingMessage>) {
  const status = response.response?.status;

  if (!status || status >= 400) {
    throw new Error(response.response?.statusText || 'Unexpected error');
  }

  const reader = response.response.body?.getReader();

  if (!reader) {
    throw new Error('Could not get reader from response');
  }

  return readableStreamReaderIntoObservable(reader).pipe(
    // append a timestamp of when each value was emitted
    timestamp(),
    // use the previous timestamp to calculate a target
    // timestamp for emitting the next value
    scan((acc, value) => {
      const lastTimestamp = acc.timestamp || 0;
      const emitAt = Math.max(lastTimestamp + MIN_DELAY, value.timestamp);
      return {
        timestamp: emitAt,
        value: value.value,
      };
    }),
    // add the delay based on the elapsed time
    // using concatMap(of(value).pipe(delay(50))
    // leads to browser issues because timers
    // are throttled when the tab is not active
    concatMap((value) => {
      const now = Date.now();
      const delayFor = value.timestamp - now;

      if (delayFor <= 0) {
        return of(value.value);
      }

      return of(value.value).pipe(delay(delayFor));
    })
  );
}

function serialize(
  signal: AbortSignal
): OperatorFunction<unknown, StreamingChatResponseEventWithoutError> {
  return (source$) =>
    source$.pipe(
      catchError((error) => {
        if (
          'response' in error &&
          'json' in error.response &&
          typeof error.response.json === 'function'
        ) {
          const responseBodyPromise = (error.response as HttpResponse['response'])!.json();

          return from(
            responseBodyPromise.then((body: { message?: string }) => {
              if (body) {
                error.body = body;
                if (body.message) {
                  error.message = body.message;
                }
              }
              throw error;
            })
          );
        }
        return throwError(() => error);
      }),
      switchMap((readable) => toObservable(readable as HttpResponse<IncomingMessage>)),
      map((line) => JSON.parse(line) as StreamingChatResponseEvent | BufferFlushEvent),
      filter(
        (line): line is Exclude<StreamingChatResponseEvent, BufferFlushEvent> =>
          line.type !== StreamingChatResponseEventType.BufferFlush
      ),
      throwSerializedChatCompletionErrors(),
      untilAborted(signal),
      shareReplay()
    );
}

export async function createChatService({
  analytics,
  signal: setupAbortSignal,
  registrations,
  apiClient,
}: {
  analytics: AnalyticsServiceStart;
  signal: AbortSignal;
  registrations: ChatRegistrationRenderFunction[];
  apiClient: ObservabilityAIAssistantAPIClient;
}): Promise<ObservabilityAIAssistantChatService> {
  const functionRegistry: FunctionRegistry = new Map();

  const renderFunctionRegistry: Map<string, RenderFunction<unknown, FunctionResponse>> = new Map();

  const [{ functionDefinitions, systemMessage }] = await Promise.all([
    apiClient('GET /internal/observability_ai_assistant/functions', {
      signal: setupAbortSignal,
    }),
    ...registrations.map((registration) => {
      return registration({
        registerRenderFunction: (name, renderFn) => {
          renderFunctionRegistry.set(name, renderFn);
        },
      });
    }),
  ]);

  functionDefinitions.forEach((fn) => {
    functionRegistry.set(fn.name, fn);
  });

  const getFunctions = (options?: { contexts?: string[]; filter?: string }) => {
    return filterFunctionDefinitions({
      ...options,
      definitions: functionDefinitions,
    });
  };

  function callStreamingApi<TEndpoint extends ObservabilityAIAssistantAPIEndpoint>(
    endpoint: TEndpoint,
    options: {
      signal: AbortSignal;
    } & ObservabilityAIAssistantAPIClientRequestParamsOf<TEndpoint>
  ): Observable<StreamingChatResponseEventWithoutError> {
    return from(
      apiClient(endpoint, {
        ...options,
        asResponse: true,
        rawResponse: true,
      })
    ).pipe(serialize(options.signal));
  }

  const client: Pick<ObservabilityAIAssistantChatService, 'chat' | 'complete'> = {
    chat(name: string, { connectorId, messages, functionCall, functions, signal }) {
      return callStreamingApi('POST /internal/observability_ai_assistant/chat', {
        params: {
          body: {
            name,
            messages,
            connectorId,
            functionCall,
            functions: functions ?? [],
          },
        },
        signal,
      }).pipe(
        filter(
          (line): line is ChatCompletionChunkEvent =>
            line.type === StreamingChatResponseEventType.ChatCompletionChunk
        )
      );
    },
    complete({
      getScreenContexts,
      connectorId,
      conversationId,
      messages,
      persist,
      disableFunctions,
      signal,
      responseLanguage,
      instructions,
    }) {
      return complete(
        {
          getScreenContexts,
          connectorId,
          conversationId,
          messages,
          persist,
          disableFunctions,
          signal,
          client,
          responseLanguage,
          instructions,
        },
        ({ params }) => {
          return callStreamingApi('POST /internal/observability_ai_assistant/chat/complete', {
            params,
            signal,
          });
        }
      );
    },
  };

  return {
    sendAnalyticsEvent: (event) => {
      sendEvent(analytics, event);
    },
    renderFunction: (name, args, response, onActionClick) => {
      const fn = renderFunctionRegistry.get(name);

      if (!fn) {
        throw new Error(`Function ${name} not found`);
      }

      const parsedArguments = args ? JSON.parse(args) : {};

      const parsedResponse = {
        content: JSON.parse(response.content ?? '{}'),
        data: JSON.parse(response.data ?? '{}'),
      };

      return fn?.({
        response: parsedResponse,
        arguments: parsedArguments,
        onActionClick,
      });
    },
    getFunctions,
    hasFunction: (name: string) => {
      return functionRegistry.has(name);
    },
    hasRenderFunction: (name: string) => {
      return renderFunctionRegistry.has(name);
    },
    getSystemMessage: (): Message => {
      return {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.System,
          content: systemMessage,
        },
      };
    },
    ...client,
  };
}
