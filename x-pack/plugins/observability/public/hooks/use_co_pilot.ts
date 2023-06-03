/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { concatMap, delay, Observable, of } from 'rxjs';
import {
  CreateChatCompletionResponseChunk,
  OpenAIPromptId,
  PromptParamsOf,
} from '../../common/openai';
import { useKibana } from '../utils/kibana_react';

export interface PromptObservableState {
  chunks: CreateChatCompletionResponseChunk[];
  message?: string;
  loading: boolean;
}

function getMessageFromChunks(chunks: CreateChatCompletionResponseChunk[]) {
  let message = '';
  chunks.forEach((chunk) => {
    message += chunk.choices[0]?.delta.content ?? '';
  });
  return message;
}

export interface CoPilotService {
  prompt<TPromptId extends OpenAIPromptId>(
    promptId: TPromptId,
    params: PromptParamsOf<TPromptId>
  ): Observable<PromptObservableState>;
}

export function useCoPilot() {
  const { http } = useKibana().services;

  return useMemo(() => {
    const service: CoPilotService = {
      prompt: (promptId, params) => {
        return new Observable<PromptObservableState>((observer) => {
          observer.next({ chunks: [], loading: true });

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

              function read() {
                reader!.read().then(({ done, value }) => {
                  if (done) {
                    observer.next({
                      chunks,
                      message: getMessageFromChunks(chunks),
                      loading: false,
                    });
                    observer.complete();
                    return;
                  }

                  const lines = decoder
                    .decode(value)
                    .trim()
                    .split('\n')
                    .map((str) => str.substr(6))
                    .filter((str) => !!str && str !== '[DONE]');

                  const nextChunks: CreateChatCompletionResponseChunk[] = lines.map((line) =>
                    JSON.parse(line)
                  );

                  nextChunks.forEach((chunk) => {
                    chunks.push(chunk);
                    observer.next({ chunks, message: getMessageFromChunks(chunks), loading: true });
                  });

                  read();
                });
              }

              read();

              return () => {
                reader.cancel();
              };
            })
            .catch((err) => {
              observer.error(err);
            });
        }).pipe(concatMap((value) => of(value).pipe(delay(50))));
      },
    };

    return service;
  }, [http]);
}
