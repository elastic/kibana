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
import { BehaviorSubject } from 'rxjs';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { ChatCompletionChunkEvent, Message, MessageRole } from '../../common';
import {
  StreamingChatResponseEventType,
  type BufferFlushEvent,
  type StreamingChatResponseEvent,
  type StreamingChatResponseEventWithoutError,
} from '../../common/conversation_complete';
import {
  FunctionDefinition,
  FunctionRegistry,
  FunctionResponse,
} from '../../common/functions/types';
import { filterFunctionDefinitions } from '../../common/utils/filter_function_definitions';
import { throwSerializedChatCompletionErrors } from '../../common/utils/throw_serialized_chat_completion_errors';
import { untilAborted } from '../../common/utils/until_aborted';
import { TelemetryEventTypeWithPayload, sendEvent } from '../analytics';
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
import { ChatActionClickHandler } from '../components/chat/types';

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

class ChatService {
  private functionRegistry: FunctionRegistry;
  private renderFunctionRegistry: Map<string, RenderFunction<unknown, FunctionResponse>>;
  private abortSignal: AbortSignal;
  private apiClient: ObservabilityAIAssistantAPIClient;
  public scope$: BehaviorSubject<AssistantScope[]>;
  private analytics: AnalyticsServiceStart;
  private registrations: ChatRegistrationRenderFunction[];
  private systemMessage: string;
  public functions$: BehaviorSubject<FunctionDefinition[]>;

  constructor({
    abortSignal,
    apiClient,
    scope$,
    analytics,
    registrations,
  }: {
    abortSignal: AbortSignal;
    apiClient: ObservabilityAIAssistantAPIClient;
    scope$: BehaviorSubject<AssistantScope[]>;
    analytics: AnalyticsServiceStart;
    registrations: ChatRegistrationRenderFunction[];
  }) {
    this.functionRegistry = new Map();
    this.renderFunctionRegistry = new Map();
    this.abortSignal = abortSignal;
    this.apiClient = apiClient;
    this.scope$ = scope$;
    this.analytics = analytics;
    this.registrations = registrations;
    this.systemMessage = '';
    this.functions$ = new BehaviorSubject([] as FunctionDefinition[]);
    scope$.subscribe(() => {
      this.initialize();
    });
  }

  private getClient = () => {
    return {
      chat: this.chat,
      complete: this.complete,
    };
  };

  async initialize() {
    this.functionRegistry = new Map();
    const systemMessages: string[] = [];
    const scopePromise = this.apiClient('GET /internal/observability_ai_assistant/functions', {
      signal: this.abortSignal,
      params: {
        query: {
          scopes: this.getScopes(),
        },
      },
    }).then(({ functionDefinitions, systemMessage }) => {
      functionDefinitions.forEach((fn) => this.functionRegistry.set(fn.name, fn));
      systemMessages.push(systemMessage);
    });

    await Promise.all([
      scopePromise,
      ...this.registrations.map((registration) => {
        return registration({
          registerRenderFunction: (name, renderFn) => {
            this.renderFunctionRegistry.set(name, renderFn);
          },
        });
      }),
    ]);

    this.systemMessage = systemMessages.join('\n');

    this.functions$.next(this.getFunctions());
  }

  public sendAnalyticsEvent = (event: TelemetryEventTypeWithPayload) => {
    sendEvent(this.analytics, event);
  };

  public renderFunction = (
    name: string,
    args: string | undefined,
    response: { data?: string; content?: string },
    onActionClick: ChatActionClickHandler
  ) => {
    const fn = this.renderFunctionRegistry.get(name);

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
  };

  public getFunctions = (options?: {
    contexts?: string[];
    filter?: string;
  }): FunctionDefinition[] => {
    return filterFunctionDefinitions({
      ...options,
      definitions: Array.from(this.functionRegistry.values()),
    });
  };

  public callStreamingApi<TEndpoint extends ObservabilityAIAssistantAPIEndpoint>(
    endpoint: TEndpoint,
    options: {
      signal: AbortSignal;
    } & ObservabilityAIAssistantAPIClientRequestParamsOf<TEndpoint>
  ): Observable<StreamingChatResponseEventWithoutError> {
    return from(
      this.apiClient(endpoint, {
        ...options,
        asResponse: true,
        rawResponse: true,
      })
    ).pipe(serialize(options.signal));
  }

  public hasFunction = (name: string) => {
    return this.functionRegistry.has(name);
  };

  public hasRenderFunction = (name: string) => {
    return this.renderFunctionRegistry.has(name);
  };

  public getSystemMessage = (): Message => {
    return {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.System,
        content: this.systemMessage,
      },
    };
  };

  public chat: ObservabilityAIAssistantChatService['chat'] = (
    name: string,
    { connectorId, messages, functionCall, functions, signal }
  ) => {
    return this.callStreamingApi('POST /internal/observability_ai_assistant/chat', {
      params: {
        body: {
          name,
          messages,
          connectorId,
          functionCall,
          functions: functions ?? [],
          scopes: this.getScopes(),
        },
      },
      signal,
    }).pipe(
      filter(
        (line): line is ChatCompletionChunkEvent =>
          line.type === StreamingChatResponseEventType.ChatCompletionChunk
      )
    );
  };

  public complete: ObservabilityAIAssistantChatService['complete'] = ({
    getScreenContexts,
    connectorId,
    conversationId,
    messages,
    persist,
    disableFunctions,
    signal,
    instructions,
  }) => {
    return complete(
      {
        getScreenContexts,
        connectorId,
        conversationId,
        messages,
        persist,
        disableFunctions,
        signal,
        client: this.getClient(),
        instructions,
        scopes: this.getScopes(),
      },
      ({ params }) => {
        return this.callStreamingApi('POST /internal/observability_ai_assistant/chat/complete', {
          params,
          signal,
        });
      }
    );
  };

  public getScopes() {
    return this.scope$.value;
  }
}

export async function createChatService({
  analytics,
  signal: setupAbortSignal,
  registrations,
  apiClient,
  scope$,
}: {
  analytics: AnalyticsServiceStart;
  signal: AbortSignal;
  registrations: ChatRegistrationRenderFunction[];
  apiClient: ObservabilityAIAssistantAPIClient;
  scope$: BehaviorSubject<AssistantScope[]>;
}): Promise<ObservabilityAIAssistantChatService> {
  return new ChatService({
    analytics,
    apiClient,
    scope$,
    registrations,
    abortSignal: setupAbortSignal,
  });
}
