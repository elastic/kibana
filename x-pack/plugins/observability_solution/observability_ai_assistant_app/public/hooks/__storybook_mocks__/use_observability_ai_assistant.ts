/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

/*
export interface ObservabilityAIAssistantChatService {
  sendAnalyticsEvent: (event: TelemetryEventTypeWithPayload) => void;
  chat: (
    name: string,
    options: {
      messages: Message[];
      connectorId: string;
      function?: 'none' | 'auto';
      signal: AbortSignal;
    }
  ) => Observable<StreamingChatResponseEventWithoutError>;
  complete: (options: {
    getScreenContexts: () => ObservabilityAIAssistantScreenContext[];
    conversationId?: string;
    connectorId: string;
    messages: Message[];
    persist: boolean;
    disableFunctions: boolean;
    signal: AbortSignal;
    responseLanguage: string;
  }) => Observable<StreamingChatResponseEventWithoutError>;
  getFunctions: (options?: { contexts?: string[]; filter?: string }) => FunctionDefinition[];
  hasFunction: (name: string) => boolean;
  getSystemMessage: () => Message;
  hasRenderFunction: (name: string) => boolean;
  renderFunction: (
    name: string,
    args: string | undefined,
    response: { data?: string; content?: string },
    onActionClick: ChatActionClickHandler
  ) => React.ReactNode;
}
*/
const service = {
  start: async () => {
    return {
      chat: () => new Subject(),
      complete: () => new Subject(),
      getFunctions: [],
      getSystemMessage: () => {},
      hasFunction: () => true,
      hasRenderFunction: (name: string) => true,
      sendAnalyticsEvent: () => {},
    };
  },
};

export function useObservabilityAIAssistant() {
  return service;
}
