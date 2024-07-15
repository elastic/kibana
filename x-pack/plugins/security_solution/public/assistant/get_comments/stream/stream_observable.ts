/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, delay, finalize, Observable, of, scan, timestamp } from 'rxjs';
import type { Dispatch, SetStateAction } from 'react';
import { handleBedrockChunk } from '@kbn/elastic-assistant-common';
import type { PromptObservableState } from './types';
import { API_ERROR } from '../translations';
const MIN_DELAY = 35;

interface StreamObservable {
  actionTypeId: string;
  isEnabledLangChain: boolean;
  isError: boolean;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

interface ResponseSchema {
  candidates: Candidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface Part {
  text: string;
}

interface Candidate {
  content: Content;
  finishReason: string;
}

interface Content {
  role: string;
  parts: Part[];
}

/**
 * Returns an Observable that reads data from a ReadableStream and emits values representing the state of the data processing.
 *
 * @param connectorTypeTitle - The title of the connector type.
 * @param isEnabledLangChain - indicates whether langchain is enabled or not
 * @param isError - indicates whether the reader response is an error message or not
 * @param reader - The ReadableStreamDefaultReader used to read data from the stream.
 * @param setLoading - A function to update the loading state.
 * @returns {Observable<PromptObservableState>} An Observable that emits PromptObservableState
 */
export const getStreamObservable = ({
  actionTypeId,
  isEnabledLangChain,
  isError,
  reader,
  setLoading,
}: StreamObservable): Observable<PromptObservableState> =>
  new Observable<PromptObservableState>((observer) => {
    observer.next({ chunks: [], loading: true });
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    // Initialize an empty string to store the OpenAI buffer.
    let openAIBuffer: string = '';
    // Initialize an empty string to store the LangChain buffer.
    let langChainBuffer: string = '';
    // Initialize an empty Uint8Array to store the Bedrock concatenated buffer.
    let bedrockBuffer: Uint8Array = new Uint8Array(0);
    // Initialize an empty string to store the Gemini buffer.
    let geminiBuffer: string = '';

    // read data from LangChain stream
    function readLangChain() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              if (langChainBuffer) {
                const finalChunk = getLangChainChunks([langChainBuffer])[0];
                if (finalChunk && finalChunk.length > 0) chunks.push(finalChunk);
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
              nextChunks.forEach((chunk: string) => {
                chunks.push(chunk);
                observer.next({
                  chunks,
                  message: chunks.join(''),
                  loading: true,
                });
              });
            } else {
              const output = decoded;
              const lines = output.split('\n');
              lines[0] = langChainBuffer + lines[0];
              langChainBuffer = lines.pop() || '';

              nextChunks = getLangChainChunks(lines);
              nextChunks.forEach((chunk: string) => {
                chunks.push(chunk);
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
          readLangChain();
        })
        .catch((err) => {
          observer.error(err);
        });
    }

    // read data from OpenAI stream
    function readOpenAI() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              if (openAIBuffer) {
                chunks.push(getOpenAIChunks([openAIBuffer])[0]);
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

    // read data from Bedrock stream
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
              const chunkHandler = (decodedChunk: string) => {
                chunks.push(decodedChunk);
                observer.next({
                  chunks,
                  message: chunks.join(''),
                  loading: true,
                });
              };
              const processedChunk = handleBedrockChunk({ chunk, bedrockBuffer, chunkHandler });
              bedrockBuffer = processedChunk.bedrockBuffer;
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

    // read data from Gemini stream
    function readGemini() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              if (geminiBuffer) {
                chunks.push(getGeminiChunks([geminiBuffer])[0]);
              }
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: false,
              });
              observer.complete();
              return;
            }

            const decoded = decoder.decode(value, { stream: true });
            const lines = decoded.split('\r');
            lines[0] = geminiBuffer + lines[0];
            geminiBuffer = lines.pop() || '';

            const nextChunks = getGeminiChunks(lines);

            nextChunks.forEach((chunk: string) => {
              const splitBySpace = chunk.split(' ');
              for (const word of splitBySpace) {
                chunks.push(`${word} `);
                observer.next({
                  chunks,
                  message: chunks.join(''),
                  loading: true,
                });
              }
            });
          } catch (err) {
            observer.error(err);
            return;
          }
          readGemini();
        })
        .catch((err) => {
          observer.error(err);
        });
    }

    // this should never actually happen
    function badConnector() {
      observer.next({
        chunks: [`Invalid connector type - ${actionTypeId} is not a supported GenAI connector.`],
        message: `Invalid connector type - ${actionTypeId} is not a supported GenAI connector.`,
        loading: false,
      });
      observer.complete();
    }
    if (isEnabledLangChain) readLangChain();
    else if (actionTypeId === '.bedrock') readBedrock();
    else if (actionTypeId === '.gen-ai') readOpenAI();
    else if (actionTypeId === '.gemini') readGemini();
    else badConnector();

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

/**
 * Parses an OpenAI response from a string.
 * @param lines
 * @returns {string[]} - Parsed string array from the OpenAI response.
 */
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

/**
 * Parses a LangChain response from a string.
 * @param lines
 * @returns {string[]} - Parsed string array from the LangChain response.
 */
const getLangChainChunks = (lines: string[]): string[] =>
  lines.reduce((acc: string[], b: string) => {
    if (b.length) {
      try {
        const obj = JSON.parse(b);
        if (obj.type === 'content' && obj.payload.length > 0) {
          return [...acc, obj.payload];
        }
        return acc;
      } catch (e) {
        return acc;
      }
    }
    return acc;
  }, []);

/**
 * Parses an Gemini response from a string.
 * @param lines
 * @returns {string[]} - Parsed string array from the Gemini response.
 */
const getGeminiChunks = (lines: string[]): string[] => {
  return lines
    .filter((str) => !!str && str !== '[DONE]')
    .map((line) => {
      try {
        const newLine = line.replaceAll('data: ', '');
        const geminiResponse: ResponseSchema = JSON.parse(newLine);
        return geminiResponse.candidates[0]?.content.parts.map((part) => part.text).join('') ?? '';
      } catch (err) {
        return '';
      }
    });
};

export const getPlaceholderObservable = () => new Observable<PromptObservableState>();
