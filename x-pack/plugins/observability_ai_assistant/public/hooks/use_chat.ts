/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { clone } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { concatMap, delay, of } from 'rxjs';
import type { Message } from '../../common/types';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

interface MessageResponse {
  content?: string;
  function_call?: {
    name: string;
    args?: string;
  };
}

export interface UseChatResult {
  content?: string;
  function_call?: {
    name: string;
    args?: string;
  };
  loading: boolean;
  error?: Error;
  abort: () => void;
  generate: (options: { messages: Message[]; connectorId: string }) => Promise<{
    content?: string;
    function_call?: { name: string; args?: string };
    aborted?: boolean;
  }>;
}

export function useChat(): UseChatResult {
  const assistant = useObservabilityAIAssistant();

  const {
    services: { notifications },
  } = useKibana();

  const [response, setResponse] = useState<MessageResponse | undefined>(undefined);

  const [error, setError] = useState<Error | undefined>(undefined);

  const [loading, setLoading] = useState(false);

  const controllerRef = useRef(new AbortController());

  const generate = useCallback(
    ({ messages, connectorId }: { messages: Message[]; connectorId: string }) => {
      controllerRef.current.abort();

      const controller = (controllerRef.current = new AbortController());

      setResponse(undefined);
      setError(undefined);
      setLoading(true);

      const partialResponse = {
        content: '',
        function_call: {
          name: '',
          args: '',
        },
      };

      return assistant
        .chat({ messages, connectorId, signal: controller.signal })
        .then((response$) => {
          return new Promise<void>((resolve, reject) => {
            const subscription = response$
              .pipe(concatMap((value) => of(value).pipe(delay(50))))
              .subscribe({
                next: (chunk) => {
                  if (controller.signal.aborted) {
                    return;
                  }
                  partialResponse.content += chunk.choices[0].delta.content ?? '';
                  partialResponse.function_call.name +=
                    chunk.choices[0].delta.function_call?.name ?? '';
                  partialResponse.function_call.args +=
                    chunk.choices[0].delta.function_call?.args ?? '';
                  setResponse(clone(partialResponse));
                },
                error: (err) => {
                  reject(err);
                },
                complete: () => {
                  resolve();
                },
              });

            controller.signal.addEventListener('abort', () => {
              subscription.unsubscribe();
              reject(new AbortError());
            });
          });
        })
        .then(() => {
          return Promise.resolve(partialResponse);
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            return Promise.resolve({
              ...partialResponse,
              aborted: true,
            });
          }
          notifications?.showErrorDialog({
            title: i18n.translate('xpack.observabilityAiAssistant.failedToLoadChatTitle', {
              defaultMessage: 'Failed to load chat',
            }),
            error: err,
          });
          setError(err);
          throw err;
        })
        .finally(() => {
          if (controller.signal.aborted) {
            return;
          }
          setLoading(false);
        });
    },
    [assistant, notifications]
  );

  useEffect(() => {
    controllerRef.current.abort();
  }, []);

  return {
    ...response,
    error,
    loading,
    abort: () => {
      setLoading(false);
      setError(new AbortError());
      controllerRef.current.abort();
    },
    generate,
  };
}
