/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, delay, finalize, Observable, of, scan, shareReplay, timestamp } from 'rxjs';
import type { Dispatch, SetStateAction } from 'react';
import { API_ERROR } from '@kbn/elastic-assistant/impl/assistant/translations';
import type { PromptObservableState } from './types';
const MIN_DELAY = 35;

/**
 * Returns an Observable that reads data from a ReadableStream and emits values representing the state of the data processing.
 *
 * @param reader - The ReadableStreamDefaultReader used to read data from the stream.
 * @param setLoading - A function to update the loading state.
 * @param isError - indicates whether the reader response is an error message or not
 * @returns {Observable<PromptObservableState>} An Observable that emits PromptObservableState
 */
export const getStreamObservable = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  setLoading: Dispatch<SetStateAction<boolean>>,
  isError: boolean
): Observable<PromptObservableState> =>
  new Observable<PromptObservableState>((observer) => {
    observer.next({ chunks: [], loading: true });
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let lineBuffer: string = '';
    function read() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              if (lineBuffer) {
                chunks.push(lineBuffer);
              }
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: false,
              });
              observer.complete();
              return;
            }

            const decoded = decoder.decode(value);
            if (isError) {
              const content = `${API_ERROR}\n\n${JSON.parse(decoded).message}`;
              chunks.push(content);
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: true,
              });
            } else {
              const lines = decoded.split('\n');

              lines[0] = lineBuffer + lines[0];
              lineBuffer = lines.pop() || '';
              const content = getNextChunk(lines);
              chunks.push(content);

              observer.next({
                chunks,
                message: chunks.join(''),
                loading: true,
              });
            }
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
      const delayFor = value.timestamp - now;

      if (delayFor <= 0) {
        return of(value.value);
      }

      return of(value.value).pipe(delay(delayFor));
    }),
    // set loading to false when the observable completes or errors out
    finalize(() => setLoading(false))
  );

const getNextChunk = (lines: string[]) => {
  const nextChunk = lines
    .map((str) => str.substring(6))
    .filter((str) => !!str && str !== '[DONE]')
    .map((line) => {
      try {
        const openaiResponse = JSON.parse(line);
        return openaiResponse.choices[0]?.delta.content ?? '';
      } catch (err) {
        return '';
      }
    })
    .join('');
  return nextChunk;
};

export const getPlaceholderObservable = () => new Observable<PromptObservableState>();
