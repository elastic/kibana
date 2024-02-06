/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart, HttpResponse } from '@kbn/core/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { IncomingMessage } from 'http';
import { pick } from 'lodash';
import { concatMap, delay, map, Observable, of, scan, shareReplay, timestamp } from 'rxjs';
import {
  StreamingChatResponseEventWithoutError,
  type StreamingChatResponseEvent,
} from '../../common/conversation_complete';
import {
  FunctionVisibility,
  type FunctionRegistry,
  type FunctionResponse,
  type Message,
} from '../../common/types';
import { filterFunctionDefinitions } from '../../common/utils/filter_function_definitions';
import { throwSerializedChatCompletionErrors } from '../../common/utils/throw_serialized_chat_completion_errors';
import type { ObservabilityAIAssistantAPIClient } from '../api';
import type {
  ChatRegistrationRenderFunction,
  ObservabilityAIAssistantChatService,
  RenderFunction,
} from '../types';
import { readableStreamReaderIntoObservable } from '../utils/readable_stream_reader_into_observable';

const MIN_DELAY = 35;

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
  client,
}: {
  analytics: AnalyticsServiceStart;
  signal: AbortSignal;
  registrations: ChatRegistrationRenderFunction[];
  client: ObservabilityAIAssistantAPIClient;
}): Promise<ObservabilityAIAssistantChatService> {
  const functionRegistry: FunctionRegistry = new Map();

  const renderFunctionRegistry: Map<string, RenderFunction<unknown, FunctionResponse>> = new Map();

  const [{ functionDefinitions, contextDefinitions }] = await Promise.all([
    client('GET /internal/observability_ai_assistant/functions', {
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

  return {
    analytics,
    renderFunction: (name, args, response) => {
      const fn = renderFunctionRegistry.get(name);

      if (!fn) {
        throw new Error(`Function ${name} not found`);
      }

      const parsedArguments = args ? JSON.parse(args) : {};

      const parsedResponse = {
        content: JSON.parse(response.content ?? '{}'),
        data: JSON.parse(response.data ?? '{}'),
      };

      return fn?.({ response: parsedResponse, arguments: parsedArguments });
    },
    getContexts: () => contextDefinitions,
    getFunctions,
    hasFunction: (name: string) => {
      return functionRegistry.has(name);
    },
    hasRenderFunction: (name: string) => {
      return renderFunctionRegistry.has(name);
    },
    complete({ connectorId, messages, conversationId, persist, signal }) {
      return new Observable<StreamingChatResponseEventWithoutError>((subscriber) => {
        client('POST /internal/observability_ai_assistant/chat/complete', {
          params: {
            body: {
              messages,
              connectorId,
              conversationId,
              persist,
            },
          },
          signal,
          asResponse: true,
          rawResponse: true,
        })
          .then((_response) => {
            const response = _response as unknown as HttpResponse<IncomingMessage>;
            const response$ = toObservable(response)
              .pipe(
                map((line) => JSON.parse(line) as StreamingChatResponseEvent),
                throwSerializedChatCompletionErrors()
              )
              .subscribe(subscriber);

            signal.addEventListener('abort', () => {
              response$.unsubscribe();
            });
          })
          .catch((err) => {
            subscriber.error(err);
            subscriber.complete();
          });
      });
    },
    chat(
      name: string,
      {
        connectorId,
        messages,
        function: callFunctions = 'auto',
        signal,
      }: {
        connectorId: string;
        messages: Message[];
        function?: 'none' | 'auto';
        signal: AbortSignal;
      }
    ) {
      return new Observable<StreamingChatResponseEventWithoutError>((subscriber) => {
        const contexts = ['core', 'apm'];

        const functions = getFunctions({ contexts });

        client('POST /internal/observability_ai_assistant/chat', {
          params: {
            body: {
              name,
              messages,
              connectorId,
              functions:
                callFunctions === 'none'
                  ? []
                  : functions
                      .filter((fn) => fn.visibility !== FunctionVisibility.User)
                      .map((fn) => pick(fn, 'name', 'description', 'parameters')),
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
                map((line) => JSON.parse(line) as StreamingChatResponseEvent),
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
  };
}
