/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, HttpResponse } from '@kbn/core/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { IncomingMessage } from 'http';
import { pick } from 'lodash';
import {
  concatMap,
  delay,
  filter,
  from,
  map,
  Observable,
  of,
  scan,
  shareReplay,
  switchMap,
  timestamp,
} from 'rxjs';
import {
  type BufferFlushEvent,
  StreamingChatResponseEventType,
  type StreamingChatResponseEventWithoutError,
  type StreamingChatResponseEvent,
  TokenCountEvent,
} from '../../common/conversation_complete';
import {
  FunctionRegistry,
  FunctionResponse,
  FunctionVisibility,
} from '../../common/functions/types';
import { filterFunctionDefinitions } from '../../common/utils/filter_function_definitions';
import { throwSerializedChatCompletionErrors } from '../../common/utils/throw_serialized_chat_completion_errors';
import { sendEvent } from '../analytics';
import type { ObservabilityAIAssistantAPIClient } from '../api';
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

  const [{ functionDefinitions, contextDefinitions }] = await Promise.all([
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

  const client: Pick<ObservabilityAIAssistantChatService, 'chat' | 'complete'> = {
    chat(name: string, { connectorId, messages, function: callFunctions = 'auto', signal }) {
      return new Observable<StreamingChatResponseEventWithoutError>((subscriber) => {
        const contexts = ['core', 'apm'];

        const functions = getFunctions({ contexts }).filter((fn) => {
          const visibility = fn.visibility ?? FunctionVisibility.All;

          return (
            visibility === FunctionVisibility.All || visibility === FunctionVisibility.AssistantOnly
          );
        });

        apiClient('POST /internal/observability_ai_assistant/chat', {
          params: {
            body: {
              name,
              messages,
              connectorId,
              functions:
                callFunctions === 'none'
                  ? []
                  : functions.map((fn) => pick(fn, 'name', 'description', 'parameters')),
            },
          },
          signal,
          asResponse: true,
          rawResponse: true,
        })
          .then((_response) => {
            const response = _response as unknown as HttpResponse<IncomingMessage>;

            const subscription = toObservable(response)
              .pipe(
                map(
                  (line) =>
                    JSON.parse(line) as
                      | StreamingChatResponseEvent
                      | BufferFlushEvent
                      | TokenCountEvent
                ),
                filter(
                  (line): line is StreamingChatResponseEvent =>
                    line.type !== StreamingChatResponseEventType.BufferFlush &&
                    line.type !== StreamingChatResponseEventType.TokenCount
                ),
                throwSerializedChatCompletionErrors()
              )
              .subscribe(subscriber);

            // if the request is aborted, convert that into state as well
            signal.addEventListener('abort', () => {
              subscriber.error(new AbortError());
              subscription.unsubscribe();
            });
          })
          .catch(async (err) => {
            if ('response' in err) {
              const body = await (err.response as HttpResponse['response'])?.json();
              err.body = body;
              if (body.message) {
                err.message = body.message;
              }
            }
            throw err;
          })
          .catch((err) => {
            subscriber.error(err);
          });

        return subscriber;
      }).pipe(
        // make sure the request is only triggered once,
        // even with multiple subscribers
        shareReplay()
      );
    },
    complete({
      getScreenContexts,
      connectorId,
      conversationId,
      messages,
      persist,
      signal,
      responseLanguage,
    }) {
      return complete(
        {
          getScreenContexts,
          connectorId,
          conversationId,
          messages,
          persist,
          signal,
          client,
          responseLanguage,
        },
        ({ params }) => {
          return from(
            apiClient('POST /internal/observability_ai_assistant/chat/complete', {
              params,
              signal,
              asResponse: true,
              rawResponse: true,
            })
          ).pipe(
            map((_response) => toObservable(_response as unknown as HttpResponse<IncomingMessage>)),
            switchMap((response$) => response$),
            map((line) => JSON.parse(line) as StreamingChatResponseEvent | BufferFlushEvent),
            shareReplay()
          );
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
    getContexts: () => contextDefinitions,
    getFunctions,
    hasFunction: (name: string) => {
      return functionRegistry.has(name);
    },
    hasRenderFunction: (name: string) => {
      return renderFunctionRegistry.has(name);
    },
    ...client,
  };
}
