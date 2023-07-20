/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HttpSetup } from '@kbn/core/public';
import { ChatCompletionRequestMessage } from 'openai';
import { BehaviorSubject, concatMap, delay, of } from 'rxjs';
import {
  type CreateChatCompletionResponseChunk,
  loadCoPilotPrompts,
} from '../../../common/co_pilot';
import type { CoPilotService } from '../../typings/co_pilot';

function getMessageFromChunks(chunks: CreateChatCompletionResponseChunk[]) {
  let message = '';
  chunks.forEach((chunk) => {
    message += chunk.choices[0]?.delta.content ?? '';
  });
  return message;
}

export function createCoPilotService({
  enabled,
  trackingEnabled,
  http,
}: {
  enabled: boolean;
  trackingEnabled: boolean;
  http: HttpSetup;
}) {
  const service: CoPilotService = {
    isEnabled: () => enabled,
    isTrackingEnabled: () => trackingEnabled,
    prompt: (promptId, params) => {
      const subject = new BehaviorSubject({
        messages: [] as ChatCompletionRequestMessage[],
        loading: true,
        message: '',
      });

      loadCoPilotPrompts()
        .then((coPilotPrompts) => {
          const messages = coPilotPrompts[promptId].messages(params as any);
          subject.next({
            messages,
            loading: true,
            message: '',
          });

          http
            .post(`/internal/observability/copilot/prompts/${promptId}`, {
              body: JSON.stringify(params),
              asResponse: true,
              rawResponse: true,
            })
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

              const chunks: CreateChatCompletionResponseChunk[] = [];

              let prev: string = '';

              function read() {
                reader!.read().then(({ done, value }) => {
                  try {
                    if (done) {
                      subject.next({
                        messages,
                        message: getMessageFromChunks(chunks),
                        loading: false,
                      });
                      subject.complete();
                      return;
                    }

                    let lines = (prev + decoder.decode(value)).split('\n');

                    const lastLine = lines[lines.length - 1];

                    const isPartialChunk = !!lastLine && lastLine !== 'data: [DONE]';

                    if (isPartialChunk) {
                      prev = lastLine;
                      lines.pop();
                    } else {
                      prev = '';
                    }

                    lines = lines
                      .map((str) => str.substr(6))
                      .filter((str) => !!str && str !== '[DONE]');

                    const nextChunks: CreateChatCompletionResponseChunk[] = lines.map((line) =>
                      JSON.parse(line)
                    );

                    nextChunks.forEach((chunk) => {
                      chunks.push(chunk);
                      subject.next({
                        messages,
                        message: getMessageFromChunks(chunks),
                        loading: true,
                      });
                    });
                  } catch (err) {
                    subject.error(err);
                    return;
                  }
                  read();
                });
              }

              read();
            })
            .catch(async (err) => {
              if ('response' in err) {
                try {
                  const responseBody = await err.response.json();
                  err.message = responseBody.message;
                } catch {
                  // leave message as-is
                }
              }
              subject.error(err);
            });
        })
        .catch((err) => {});

      return subject.pipe(concatMap((value) => of(value).pipe(delay(25))));
    },
    track: async ({ messages, response, responseTime, feedbackAction, promptId }) => {
      await http.post(`/internal/observability/copilot/prompts/${promptId}/track`, {
        body: JSON.stringify({
          response,
          feedbackAction,
          messages,
          responseTime,
        }),
      });
    },
  };

  return service;
}
