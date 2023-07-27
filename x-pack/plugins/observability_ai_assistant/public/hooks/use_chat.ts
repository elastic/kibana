/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clone } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { concatMap, delay, of } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { Message } from '../../common/types';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

interface MessageResponse {
  content?: string;
  function_call?: {
    name?: string;
    args?: string;
  };
}

export function useChat({ messages, connectorId }: { messages: Message[]; connectorId: string }): {
  content?: string;
  function_call?: {
    name?: string;
    args?: string;
  };
  loading: boolean;
  error?: Error;
  abort: () => void;
  regenerate: () => void;
} {
  const assistant = useObservabilityAIAssistant();

  const {
    services: { notifications },
  } = useKibana();

  const [response, setResponse] = useState<MessageResponse | undefined>(undefined);

  const [error, setError] = useState<Error | undefined>(undefined);

  const [loading, setLoading] = useState(false);

  const controllerRef = useRef(new AbortController());

  const regenerate = useCallback(() => {
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

    assistant
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

          controllerRef.current.signal.addEventListener('abort', () => {
            subscription.unsubscribe();
            reject(new AbortError());
          });
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }
        notifications?.showErrorDialog({
          title: i18n.translate('xpack.observabilityAiAssistant.failedToLoadChatTitle', {
            defaultMessage: 'Failed to load chat',
          }),
          error: err,
        });
        setError(err);
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [messages, connectorId, assistant, notifications]);

  useEffect(() => {
    return regenerate();
  }, [regenerate]);

  return {
    ...response,
    error,
    loading,
    abort: () => {
      setLoading(false);
      setError(new AbortError());
      controllerRef.current.abort();
    },
    regenerate,
  };
}
