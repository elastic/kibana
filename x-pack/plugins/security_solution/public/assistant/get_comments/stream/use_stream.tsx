/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import { concatMap, delay, Observable, of, scan, share, shareReplay, timestamp } from 'rxjs';
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
const MIN_DELAY = 35;
export const useStream = ({ amendMessage, content, reader }: UseStreamProps): UseStream => {
  const observer$ = useMemo(
    () =>
      content == null && reader != null
        ? new Observable<PromptObservableState>((observer) => {
            observer.next({ chunks: [], loading: true });
            const decoder = new TextDecoder();
            const chunks: Chunk[] = [];
            let prev: string = '';
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
                    let lines: string[] = (prev + decoder.decode(value)).split('\n');
                    const lastLine: string = lines[lines.length - 1];
                    const isPartialChunk: boolean = !!lastLine && lastLine !== 'data: [DONE]';
                    if (isPartialChunk) {
                      prev = lastLine;
                      lines.pop();
                    } else {
                      prev = '';
                    }
                    lines = lines
                      .map((str) => str.substr(6))
                      .filter((str) => !!str && str !== '[DONE]');
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
                })
                .catch((err) => {
                  observer.error(err);
                });
            }
            read();
            return () => {
              reader.cancel();
            };
          }).pipe(
            // make sure the request is only triggered once,
            // even with multiple subscribers
            shareReplay(1),
            // append a timestamp of when each value was emitted
            timestamp(),
            // use the previous timestamp to calculate a target
            // timestamp for emitting the next value
            scan((acc, value) => {
              const lastTimestamp = acc.timestamp || 0;
              const emitAt = Math.max(lastTimestamp + MIN_DELAY, value.timestamp);
              return {
                timestamp: emitAt,
                value: value.value,
              };
            }),
            // add the delay based on the elapsed time
            // using concatMap(of(value).pipe(delay(50))
            // leads to browser issues because timers
            // are throttled when the tab is not active
            concatMap((value) => {
              const now = Date.now();
              console.log('VALUE?', value);
              const delayFor = value.timestamp - now;

              if (delayFor <= 0) {
                return of(value.value);
              }

              return of(value.value).pipe(delay(delayFor));
            })
          )
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
        setLoading(false);
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
  let message = '';
  chunks.forEach((chunk) => {
    message += chunk.choices[0]?.delta.content ?? '';
  });
  return message;
}
