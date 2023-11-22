/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, delay, finalize, Observable, of, scan, timestamp } from 'rxjs';
import type { Dispatch, SetStateAction } from 'react';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import type { PromptObservableState } from './types';
import { API_ERROR } from '../translations';
const MIN_DELAY = 35;

interface StreamObservable {
  connectorTypeTitle: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  isError: boolean;
}
/**
 * Returns an Observable that reads data from a ReadableStream and emits values representing the state of the data processing.
 *
 * @param reader - The ReadableStreamDefaultReader used to read data from the stream.
 * @param setLoading - A function to update the loading state.
 * @param isError - indicates whether the reader response is an error message or not
 * @returns {Observable<PromptObservableState>} An Observable that emits PromptObservableState
 */
export const getStreamObservable = ({
  connectorTypeTitle,
  isError,
  reader,
  setLoading,
}: StreamObservable): Observable<PromptObservableState> =>
  new Observable<PromptObservableState>((observer) => {
    observer.next({ chunks: [], loading: true });
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let openAIBuffer: string = '';

    let bedrockBuffer: Uint8Array = new Uint8Array(0);
    function readOpenAI() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              if (openAIBuffer) {
                chunks.push(openAIBuffer);
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
            let nextChunks;
            if (isError) {
              nextChunks = [`${API_ERROR}\n\n${JSON.parse(decoded).message}`];
            } else {
              const lines = decoded.split('\n');
              lines[0] = openAIBuffer + lines[0];
              openAIBuffer = lines.pop() || '';
              nextChunks = getOpenAIChunks(lines);
            }
            nextChunks.forEach((chunk: string) => {
              chunks.push(chunk);
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: true,
              });
            });
          } catch (err) {
            observer.error(err);
            return;
          }
          readOpenAI();
        })
        .catch((err) => {
          observer.error(err);
        });
    }
    function readBedrock() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: false,
              });
              observer.complete();
              return;
            }

            let content;
            if (isError) {
              content = `${API_ERROR}\n\n${JSON.parse(decoder.decode(value)).message}`;
              chunks.push(content);
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: true,
              });
            } else if (value != null) {
              const chunk: Uint8Array = value;

              bedrockBuffer = concatChunks(bedrockBuffer, chunk);
              let messageLength = getMessageLength(bedrockBuffer);

              const buildChunks = [];
              while (bedrockBuffer.byteLength > 0 && bedrockBuffer.byteLength >= messageLength) {
                const extractedChunk = bedrockBuffer.slice(0, messageLength);
                buildChunks.push(extractedChunk);
                bedrockBuffer = bedrockBuffer.slice(messageLength);
                messageLength = getMessageLength(bedrockBuffer);
              }

              const awsDecoder = new EventStreamCodec(toUtf8, fromUtf8);
              buildChunks.forEach((bChunk) => {
                const event = awsDecoder.decode(bChunk);
                const body = JSON.parse(
                  Buffer.from(JSON.parse(decoder.decode(event.body)).bytes, 'base64').toString()
                );
                content = body.completion;
                chunks.push(content);
                observer.next({
                  chunks,
                  message: chunks.join(''),
                  loading: true,
                });
              });
            }
          } catch (err) {
            observer.error(err);
            return;
          }
          readBedrock();
        })
        .catch((err) => {
          observer.error(err);
        });
    }

    if (connectorTypeTitle === 'Amazon Bedrock') readBedrock();
    else if (connectorTypeTitle === 'OpenAI') readOpenAI();
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

const getOpenAIChunks = (lines: string[]): string[] => {
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
    });
  return nextChunk;
};

function concatChunks(a: Uint8Array, b: Uint8Array) {
  const newBuffer = new Uint8Array(a.length + b.length);
  newBuffer.set(a);
  newBuffer.set(b, a.length);
  return newBuffer;
}

function getMessageLength(buffer: Uint8Array) {
  if (buffer.byteLength === 0) return 0;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  return view.getUint32(0, false);
}

export const getPlaceholderObservable = () => new Observable<PromptObservableState>();
