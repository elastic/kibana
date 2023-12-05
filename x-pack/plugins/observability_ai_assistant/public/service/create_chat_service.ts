/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/
import { Validator, type Schema, type OutputUnit } from '@cfworker/json-schema';

import { AnalyticsServiceStart, HttpResponse } from '@kbn/core/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { IncomingMessage } from 'http';
import { cloneDeep, pick } from 'lodash';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  delay,
  filter as rxJsFilter,
  finalize,
  map,
  of,
  scan,
  shareReplay,
  tap,
  timestamp,
} from 'rxjs';
import {
  ContextRegistry,
  FunctionRegistry,
  FunctionVisibility,
  Message,
  MessageRole,
  type RegisterContextDefinition,
  type RegisterFunctionDefinition,
} from '../../common/types';
import { ObservabilityAIAssistantAPIClient } from '../api';
import type {
  ChatRegistrationFunction,
  CreateChatCompletionResponseChunk,
  ObservabilityAIAssistantChatService,
  PendingMessage,
} from '../types';
import { readableStreamReaderIntoObservable } from '../utils/readable_stream_reader_into_observable';

class TokenLimitReachedError extends Error {
  constructor() {
    super(`Token limit reached`);
  }
}

class ServerError extends Error {}

export class FunctionArgsValidationError extends Error {
  constructor(public readonly errors: OutputUnit[]) {
    super('Function arguments are invalid');
  }
}

export async function createChatService({
  analytics,
  signal: setupAbortSignal,
  registrations,
  client,
}: {
  analytics: AnalyticsServiceStart;
  signal: AbortSignal;
  registrations: ChatRegistrationFunction[];
  client: ObservabilityAIAssistantAPIClient;
}): Promise<ObservabilityAIAssistantChatService> {
  const contextRegistry: ContextRegistry = new Map();
  const functionRegistry: FunctionRegistry = new Map();

  const validators = new Map<string, Validator>();

  const registerContext: RegisterContextDefinition = (context) => {
    contextRegistry.set(context.name, context);
  };

  const registerFunction: RegisterFunctionDefinition = (def, respond, render) => {
    validators.set(def.name, new Validator(def.parameters as Schema, '2020-12', true));
    functionRegistry.set(def.name, { options: def, respond, render });
  };

  const getContexts: ObservabilityAIAssistantChatService['getContexts'] = () => {
    return Array.from(contextRegistry.values());
  };
  const getFunctions: ObservabilityAIAssistantChatService['getFunctions'] = ({
    contexts,
    filter,
  } = {}) => {
    const allFunctions = Array.from(functionRegistry.values());

    return contexts || filter
      ? allFunctions.filter((fn) => {
          const matchesContext =
            !contexts || fn.options.contexts.some((context) => contexts.includes(context));
          const matchesFilter =
            !filter || fn.options.name.includes(filter) || fn.options.description.includes(filter);

          return matchesContext && matchesFilter;
        })
      : allFunctions;
  };

  await Promise.all(
    registrations.map((fn) => fn({ signal: setupAbortSignal, registerContext, registerFunction }))
  );

  function validate(name: string, parameters: unknown) {
    const validator = validators.get(name)!;
    const result = validator.validate(parameters);
    if (!result.valid) {
      throw new FunctionArgsValidationError(result.errors);
    }
  }

  return {
    analytics,
    executeFunction: async ({ name, args, signal, messages, connectorId }) => {
      const fn = functionRegistry.get(name);

      if (!fn) {
        throw new Error(`Function ${name} not found`);
      }

      const parsedArguments = args ? JSON.parse(args) : {};

      validate(name, parsedArguments);

      return await fn.respond({ arguments: parsedArguments, messages, connectorId }, signal);
    },
    renderFunction: (name, args, response) => {
      const fn = functionRegistry.get(name);

      if (!fn) {
        throw new Error(`Function ${name} not found`);
      }

      const parsedArguments = args ? JSON.parse(args) : {};

      const parsedResponse = {
        content: JSON.parse(response.content ?? '{}'),
        data: JSON.parse(response.data ?? '{}'),
      };

      return fn.render?.({ response: parsedResponse, arguments: parsedArguments });
    },
    getContexts,
    getFunctions,
    hasFunction: (name: string) => {
      return !!getFunctions().find((fn) => fn.options.name === name);
    },
    hasRenderFunction: (name: string) => {
      return !!getFunctions().find((fn) => fn.options.name === name)?.render;
    },
    chat({
      connectorId,
      messages,
      function: callFunctions = 'auto',
    }: {
      connectorId: string;
      messages: Message[];
      function?: 'none' | 'auto';
    }) {
      const subject = new BehaviorSubject<PendingMessage>({
        message: {
          role: MessageRole.Assistant,
        },
      });

      const contexts = ['core', 'apm'];

      const functions = getFunctions({ contexts });

      const controller = new AbortController();

      client('POST /internal/observability_ai_assistant/chat', {
        params: {
          body: {
            messages,
            connectorId,
            functions:
              callFunctions === 'none'
                ? []
                : functions
                    .filter((fn) => fn.options.visibility !== FunctionVisibility.User)
                    .map((fn) => pick(fn.options, 'name', 'description', 'parameters')),
          },
        },
        signal: controller.signal,
        asResponse: true,
        rawResponse: true,
      })
        .then((_response) => {
          const response = _response as unknown as HttpResponse<IncomingMessage>;

          const status = response.response?.status;

          if (!status || status >= 400) {
            throw new Error(response.response?.statusText || 'Unexpected error');
          }

          const reader = response.response.body?.getReader();

          if (!reader) {
            throw new Error('Could not get reader from response');
          }

          const subscription = readableStreamReaderIntoObservable(reader)
            .pipe(
              // lines start with 'data: '
              map((line) => line.substring(6)),
              // a message completes with the line '[DONE]'
              rxJsFilter((line) => !!line && line !== '[DONE]'),
              // parse the JSON, add the type
              map(
                (line) =>
                  JSON.parse(line) as
                    | CreateChatCompletionResponseChunk
                    | { error: { message: string } }
              ),
              // validate the message. in some cases OpenAI
              // will throw halfway through the message
              tap((line) => {
                if ('error' in line) {
                  throw new ServerError(line.error.message);
                }
              }),
              // there also might be some metadata that we need
              // to exclude
              rxJsFilter(
                (line): line is CreateChatCompletionResponseChunk =>
                  'object' in line && line.object === 'chat.completion.chunk'
              ),
              // this is how OpenAI signals that the context window
              // limit has been exceeded
              tap((line) => {
                if (line.choices[0].finish_reason === 'length') {
                  throw new TokenLimitReachedError();
                }
              }),
              // merge the messages
              scan(
                (acc, { choices }) => {
                  acc.message.content += choices[0].delta.content ?? '';
                  acc.message.function_call.name += choices[0].delta.function_call?.name ?? '';
                  acc.message.function_call.arguments +=
                    choices[0].delta.function_call?.arguments ?? '';
                  return cloneDeep(acc);
                },
                {
                  message: {
                    content: '',
                    function_call: {
                      name: '',
                      arguments: '',
                      trigger: MessageRole.Assistant as const,
                    },
                    role: MessageRole.Assistant,
                  },
                }
              ),
              // convert an error into state
              catchError((error) =>
                of({
                  ...subject.value,
                  error,
                  aborted: error instanceof AbortError || controller.signal.aborted,
                })
              )
            )
            .subscribe(subject);

          // if the request is aborted, convert that into state as well
          controller.signal.addEventListener('abort', () => {
            subscription.unsubscribe();
            subject.next({
              ...subject.value,
              aborted: true,
            });
            subject.complete();
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
          subject.next({
            ...subject.value,
            aborted: false,
            error: err,
          });
          subject.complete();
        });

      const MIN_DELAY = 35;

      const pendingMessages$ = subject.pipe(
        // make sure the request is only triggered once,
        // even with multiple subscribers
        shareReplay(1),
        // if the Observable is no longer subscribed,
        // abort the running request
        finalize(() => {
          controller.abort();
        }),
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

      return pendingMessages$;
    },
  };
}
