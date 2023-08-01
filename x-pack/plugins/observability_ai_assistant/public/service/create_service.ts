/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpResponse } from '@kbn/core/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { IncomingMessage } from 'http';
import { cloneDeep } from 'lodash';
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
} from 'rxjs';
import type { Message } from '../../common';
import { ContextRegistry, FunctionRegistry, MessageRole } from '../../common/types';
import { createCallObservabilityAIAssistantAPI } from '../api';
import type {
  CreateChatCompletionResponseChunk,
  ObservabilityAIAssistantService,
  PendingMessage,
} from '../types';
import { readableStreamReaderIntoObservable } from '../utils/readable_stream_reader_into_observable';

export function createService({
  coreStart,
  securityStart,
  functionRegistry,
  contextRegistry,
}: {
  coreStart: CoreStart;
  securityStart: SecurityPluginStart;
  functionRegistry: FunctionRegistry;
  contextRegistry: ContextRegistry;
}): ObservabilityAIAssistantService {
  const client = createCallObservabilityAIAssistantAPI(coreStart);

  const getContexts: ObservabilityAIAssistantService['getContexts'] = () => {
    return Array.from(contextRegistry.values());
  };
  const getFunctions: ObservabilityAIAssistantService['getFunctions'] = ({
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

  return {
    isEnabled: () => {
      return true;
    },
    chat({ connectorId, messages }: { connectorId: string; messages: Message[] }) {
      const subject = new BehaviorSubject<PendingMessage>({
        message: {
          role: MessageRole.Assistant,
        },
      });

      const contexts = ['core'];

      const functions = getFunctions({ contexts });

      const controller = new AbortController();

      client('POST /internal/observability_ai_assistant/chat', {
        params: {
          body: {
            messages,
            connectorId,
            functions: functions.map((fn) => fn.options),
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
              map((line) => line.substring(6)),
              rxJsFilter((line) => !!line && line !== '[DONE]'),
              map((line) => JSON.parse(line) as CreateChatCompletionResponseChunk),
              rxJsFilter((line) => line.object === 'chat.completion.chunk'),
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
              catchError((error) =>
                of({
                  ...subject.value,
                  error,
                  aborted: error instanceof AbortError || controller.signal.aborted,
                })
              )
            )
            .subscribe(subject);

          controller.signal.addEventListener('abort', () => {
            subscription.unsubscribe();
            subject.next({
              ...subject.value,
              aborted: true,
            });
            subject.complete();
          });
        })
        .catch((err) => {
          subject.next({
            ...subject.value,
            aborted: false,
            error: err,
          });
          subject.complete();
        });

      return subject.pipe(
        concatMap((value) => of(value).pipe(delay(50))),
        shareReplay(1),
        finalize(() => {
          controller.abort();
        })
      );
    },
    callApi: client,
    getCurrentUser: () => securityStart.authc.getCurrentUser(),
    getContexts,
    getFunctions,
    executeFunction: async (name, args, signal) => {
      const fn = functionRegistry.get(name);

      if (!fn) {
        throw new Error(`Function ${name} not found`);
      }

      const parsedArguments = args ? JSON.parse(args) : {};

      // validate

      return await fn.respond({ arguments: parsedArguments }, signal);
    },
    renderFunction: (name, response) => {
      const fn = functionRegistry.get(name);

      if (!fn) {
        throw new Error(`Function ${name} not found`);
      }

      return fn.render?.({ response });
    },
  };
}
