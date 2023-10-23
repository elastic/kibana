/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import { concatMap, delay, Observable, of, share } from 'rxjs';
interface UseStreamProps {
  amendMessage: (message: string, index: number) => void;
  index: number;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

interface UseStream {
  error: string | undefined;
  isLoading: boolean;
  isStreaming: boolean;
  pendingMessage: string;
  setComplete: (complete: boolean) => void;
  subscription: Subscription | undefined;
}

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

export const useStream = ({ amendMessage, index, reader }: UseStreamProps): UseStream => {
  const observer$ = useMemo(
    () =>
      new Observable<PromptObservableState>((observer) => {
        observer.next({ chunks: [], loading: true });

        const decoder = new TextDecoder();

        const chunks: Chunk[] = [];

        let prev: string = '';

        function read() {
          reader.read().then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
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

              let lines: string[] = (prev + decoder.decode(value)).split('\n');

              const lastLine: string = lines[lines.length - 1];

              const isPartialChunk: boolean = !!lastLine && lastLine !== 'data: [DONE]';

              if (isPartialChunk) {
                prev = lastLine;
                lines.pop();
              } else {
                prev = '';
              }

              lines = lines.map((str) => str.substr(6)).filter((str) => !!str && str !== '[DONE]');

              const nextChunks: Chunk[] = lines.map((line) => JSON.parse(line));

              nextChunks.forEach((chunk) => {
                chunks.push(chunk);
                observer.next({
                  chunks,
                  message: getMessageFromChunks(chunks),
                  loading: true,
                });
              });
            } catch (err) {
              observer.error(err);
              return;
            }
            read();
          });
        }

        read();

        return () => {
          reader.cancel();
        };
      }).pipe(concatMap((value) => of(value).pipe(delay(50)))),

    [reader]
  );

  const [pendingMessage, setPendingMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [subscription, setSubscription] = useState<Subscription | undefined>();

  const onCompleteStream = useCallback(() => {
    amendMessage(pendingMessage ?? '', index);
  }, [amendMessage, index, pendingMessage]);

  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (complete) {
      onCompleteStream();
    }
  }, [complete, onCompleteStream]);

  useEffect(() => {
    const newSubscription = observer$.pipe(share()).subscribe({
      next: ({ message, loading: isLoading }) => {
        setLoading(isLoading);

        setPendingMessage(message);
      },
      complete: () => {
        setComplete(true);
        setLoading(false);
      },
      error: (err) => {
        setError(err.message);
      },
    });
    setSubscription(newSubscription);
  }, [observer$]);

  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  if (loading) {
    state = pendingMessage ? 'streaming' : 'loading';
  } else if (error) {
    state = 'error';
  } else if (pendingMessage) {
    state = 'complete';
  }

  const isLoading = state === 'init' || state === 'loading';
  const isStreaming = state === 'streaming';
  return {
    error,
    isLoading,
    isStreaming,
    pendingMessage: pendingMessage ?? '',
    setComplete,
    subscription,
  };
};

function getMessageFromChunks(chunks: Chunk[]) {
  let message = '';
  chunks.forEach((chunk) => {
    message += chunk.choices[0]?.delta.content ?? '';
  });
  return message;
}
