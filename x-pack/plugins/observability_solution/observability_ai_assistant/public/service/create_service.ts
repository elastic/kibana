/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import { compact, without } from 'lodash';
import { BehaviorSubject, debounceTime, filter, lastValueFrom, of, Subject, take } from 'rxjs';
import type {
  AssistantScope,
  Message,
  ObservabilityAIAssistantScreenContext,
} from '../../common/types';
import { createFunctionRequestMessage } from '../../common/utils/create_function_request_message';
import { createFunctionResponseMessage } from '../../common/utils/create_function_response_message';
import { createCallObservabilityAIAssistantAPI } from '../api';
import type { ChatRegistrationRenderFunction, ObservabilityAIAssistantService } from '../types';
import { defaultStarterPrompts } from './default_starter_prompts';

export function createService({
  analytics,
  coreStart,
  enabled,
  scope,
}: {
  analytics: AnalyticsServiceStart;
  coreStart: CoreStart;
  enabled: boolean;
  scope: AssistantScope;
}): ObservabilityAIAssistantService {
  const apiClient = createCallObservabilityAIAssistantAPI(coreStart);

  const registrations: ChatRegistrationRenderFunction[] = [];

  const screenContexts$ = new BehaviorSubject<ObservabilityAIAssistantScreenContext[]>([
    { starterPrompts: defaultStarterPrompts },
  ]);
  const predefinedConversation$ = new Subject<{ messages: Message[]; title?: string }>();

  return {
    isEnabled: () => {
      return enabled;
    },
    register: (fn) => {
      registrations.push(fn);
    },
    start: async ({ signal }) => {
      const mod = await import('./create_chat_service');
      return await mod.createChatService({ analytics, apiClient, signal, registrations, scope });
    },
    callApi: apiClient,
    getScreenContexts() {
      return screenContexts$.value;
    },
    setScreenContext: (context: ObservabilityAIAssistantScreenContext) => {
      screenContexts$.next(screenContexts$.value.concat(context));

      function unsubscribe() {
        screenContexts$.next(without(screenContexts$.value, context));
      }

      return unsubscribe;
    },
    navigate: async (cb) => {
      cb();

      // wait for at least 1s of no network activity
      await lastValueFrom(
        coreStart.http.getLoadingCount$().pipe(
          filter((count) => count === 0),
          debounceTime(1000),
          take(1)
        )
      );

      return of(
        createFunctionRequestMessage({
          name: 'context',
        }),
        createFunctionResponseMessage({
          name: 'context',
          content: {
            screenDescription: compact(
              screenContexts$.value.map((context) => context.screenDescription)
            ).join('\n\n'),
          },
        })
      );
    },
    conversations: {
      openNewConversation: ({ messages, title }: { messages: Message[]; title?: string }) => {
        predefinedConversation$.next({ messages, title });
      },
      predefinedConversation$: predefinedConversation$.asObservable(),
    },
  };
}
