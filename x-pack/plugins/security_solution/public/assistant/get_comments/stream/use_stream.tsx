/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import { delay, Observable, share } from 'rxjs';

export interface PromptObservableState {
  chunks: Chunk[];
  message?: string;
  error?: string;
  loading: boolean;
}

interface ChunkChoice {
  index: 0;
  delta: { role: string; content: string };
  finish_reason: null | string;
}

interface Chunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChunkChoice[];
}

interface UseStreamProps {
  amendMessage: (message: string) => void;
  content?: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}

interface UseStream {
  error: string | undefined;
  isLoading: boolean;
  isStreaming: boolean;
  pendingMessage: string;
  setComplete: (complete: boolean) => void;
}

export const useStream = ({ amendMessage, content, reader }: UseStreamProps): UseStream => {
  const observer$ = useMemo(
    () =>
      content == null && reader != null
        ? new Observable<PromptObservableState>((observer) => {
            observer.next({ chunks: [], loading: true });

            const decoder = new TextDecoder();
            let prev = '';
            const chunks: Chunk[] = [];

            function read() {
              reader
                ?.read()
                .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
                  try {
                    if (done) {
                      observer.next({
                        chunks,
                        message: getMessageFromChunks(chunks),
                        loading: false,
                      });
                      observer.complete();
                      return;
                    }

                    const lines: string[] = (prev + decoder.decode(value)).split('\n');
                    const lastLine: string = lines.pop() || '';
                    const isPartialChunk: boolean = !!lastLine && lastLine !== 'data: [DONE]';

                    if (isPartialChunk) {
                      prev = lastLine;
                    } else {
                      prev = '';
                    }

                    const nextChunks: Chunk[] = lines
                      .map((str) => str.substr(6))
                      .filter((str) => !!str && str !== '[DONE]')
                      .map((line) => JSON.parse(line));

                    chunks.push(...nextChunks);
                    observer.next({
                      chunks,
                      message: getMessageFromChunks(chunks),
                      loading: true,
                    });
                  } catch (err) {
                    observer.error(err);
                    return;
                  }
                  read();
                })
                .catch((err) => {
                  observer.error(err);
                });
            }

            read();

            return () => {
              reader?.cancel();
            };
          }).pipe(delay(50))
        : new Observable<PromptObservableState>(),
    [content, reader]
  );

  const [pendingMessage, setPendingMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [subscription, setSubscription] = useState<Subscription | undefined>();

  const onCompleteStream = useCallback(() => {
    subscription?.unsubscribe();
    setLoading(false);
    amendMessage(pendingMessage ?? '');
  }, [amendMessage, pendingMessage, subscription]);

  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (complete) {
      setComplete(false);
      onCompleteStream();
    }
  }, [complete, onCompleteStream]);

  useEffect(() => {
    const newSubscription = observer$.pipe(share()).subscribe({
      next: (all) => {
        const { message, loading: isLoading } = all;
        setLoading(isLoading);
        setPendingMessage(message);
      },
      complete: () => {
        setComplete(true);
      },
      error: (err) => {
        setError(err.message);
      },
    });
    setSubscription(newSubscription);
  }, [observer$]);

  return {
    error,
    isLoading: loading,
    isStreaming: loading && pendingMessage != null,
    pendingMessage: pendingMessage ?? '',
    setComplete,
  };
};

function getMessageFromChunks(chunks: Chunk[]) {
  return chunks.map((chunk) => chunk.choices[0]?.delta.content ?? '').join('');
}
