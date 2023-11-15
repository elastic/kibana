/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, delay, finalize, Observable, of, scan, timestamp } from 'rxjs';
import type { Dispatch, SetStateAction } from 'react';
import { API_ERROR } from '../translations';
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
    function read() {
      reader
        .read()
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
            const decoded = decoder.decode(value);
            const content = isError
              ? // we format errors as {message: string; status_code: number}
                `${API_ERROR}\n\n${JSON.parse(decoded).message}`
              : // all other responses are just strings (handled by subaction invokeStream)
                decoded;
            chunks.push(content);
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
      reader.cancel();
    };
  }).pipe(
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

function getMessageFromChunks(chunks: string[]) {
  return chunks.join('');
}

export const getPlaceholderObservable = () => new Observable<PromptObservableState>();
