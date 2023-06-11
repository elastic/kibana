/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpResponse, type HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, concatMap, delay, of } from 'rxjs';
import { CoPilotConversation, CoPilotConversationMessage } from '../../../common/co_pilot';
import { createStreamingChatResponseObservable } from '../../../common/co_pilot/streaming_chat_response_observable';
import { type CoPilotService } from '../../typings/co_pilot';

function httpResponseIntoObservable(responsePromise: Promise<HttpResponse>) {
  const subject = new BehaviorSubject<string>('');
  responsePromise
    .then((response) => {
      const status = response.response?.status;

      if (!status || status >= 400) {
        throw new Error(response.response?.statusText || 'Unexpected error');
      }

      const reader = response.response.body?.getReader();

      if (!reader) {
        throw new Error('Could not get reader from response');
      }

      const decoder = new TextDecoder();

      function read() {
        reader!.read().then(({ done, value }) => {
          try {
            if (done) {
              subject.complete();
              return;
            }

            subject.next(decoder.decode(value));
          } catch (err) {
            subject.error(err);
            return;
          }
          read();
        });
      }

      read();
    })
    .catch((err) => {
      subject.error(err);
    });
  return createStreamingChatResponseObservable(subject).pipe(
    concatMap((value) => of(value).pipe(delay(50)))
  );
}

export function createCoPilotService({ enabled, http }: { enabled: boolean; http: HttpSetup }) {
  const service: CoPilotService = {
    isEnabled() {
      return enabled;
    },
    prompt(promptId, params) {
      return httpResponseIntoObservable(
        http.post(`/internal/observability/copilot/prompts/${promptId}`, {
          body: JSON.stringify(params),
          asResponse: true,
          rawResponse: true,
        })
      );
    },
    async createConversation() {
      return (await http.post(`/internal/observability/copilot/conversation/create`, {})) as {
        conversation: CoPilotConversation;
      };
    },
    async listConversations(size: number) {
      return (await http.get(`/internal/observability/copilot/conversation`, {
        query: {
          size,
        },
      })) as {
        conversations: CoPilotConversation[];
      };
    },
    async loadConversation(conversationId: string) {
      return (await http.get(
        `/internal/observability/copilot/conversation/${conversationId}`,
        {}
      )) as {
        conversation: CoPilotConversation;
        messages: CoPilotConversationMessage[];
      };
    },
    async autoTitleConversation(conversationId: string) {
      return (await http.post(
        `/internal/observability/copilot/conversation/${conversationId}/auto_title`,
        {}
      )) as {
        conversation: CoPilotConversation;
      };
    },
    chat(messages) {
      return httpResponseIntoObservable(
        http.post(`/internal/observability/copilot/chat`, {
          body: JSON.stringify({
            messages,
          }),
          asResponse: true,
          rawResponse: true,
        })
      );
    },
    async append(conversationId, messages) {
      return (await http.post(
        `/internal/observability/copilot/conversation/${conversationId}/append`,
        { body: JSON.stringify({ messages }) }
      )) as {
        messages: CoPilotConversationMessage[];
      };
    },
  };

  return service;
}
