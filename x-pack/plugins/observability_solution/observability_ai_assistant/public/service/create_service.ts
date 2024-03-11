/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import { without } from 'lodash';
import { BehaviorSubject, Subject } from 'rxjs';
import type { Message, ObservabilityAIAssistantScreenContext } from '../../common/types';
import { createCallObservabilityAIAssistantAPI } from '../api';
import type { ChatRegistrationRenderFunction, ObservabilityAIAssistantService } from '../types';

export function createService({
  analytics,
  coreStart,
  enabled,
}: {
  analytics: AnalyticsServiceStart;
  coreStart: CoreStart;
  enabled: boolean;
}): ObservabilityAIAssistantService {
  const client = createCallObservabilityAIAssistantAPI(coreStart);

  const registrations: ChatRegistrationRenderFunction[] = [];

  const screenContexts$ = new BehaviorSubject<ObservabilityAIAssistantScreenContext[]>([]);
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
      return await mod.createChatService({ analytics, client, signal, registrations });
    },
    callApi: client,
    getScreenContexts() {
      return screenContexts$.value;
    },
    setScreenContext: (context: ObservabilityAIAssistantScreenContext) => {
      screenContexts$.next(screenContexts$.value.concat(context));
      return () => {
        screenContexts$.next(without(screenContexts$.value, context));
      };
    },
    conversations: {
      openNewConversation: ({ messages, title }: { messages: Message[]; title?: string }) => {
        predefinedConversation$.next({ messages, title });
      },
      predefinedConversation$: predefinedConversation$.asObservable(),
    },
  };
}
