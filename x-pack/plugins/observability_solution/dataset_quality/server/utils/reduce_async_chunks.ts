/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable, OperatorFunction, from, lastValueFrom, mergeMap, reduce } from 'rxjs';
import deepmerge from 'deepmerge';

type CallbackFn<TResult> = (chunk: string[], id: number) => Promise<TResult>;

const MAX_HTTP_LINE_LENGTH = 4096;
// Apply an 80% threshold to the http line max length to guarantee enough space for url and potentially other parameters.
// This value might need to vary as it's an estimate of how much we can reserve for the chunked list length.
const MAX_CHUNK_LENGTH = MAX_HTTP_LINE_LENGTH * 0.75; // 4096 *0.75 === 3072 characters, as 1 chars = 1 byte

export const reduceAsyncChunks = <TResult>(list: string[], chunkExecutor: CallbackFn<TResult>) => {
  const result$ = from(list).pipe(
    bufferUntil(isLessThanMaxChunkLength),
    mergeMap((chunk, id) => from(chunkExecutor(chunk, id))),
    reduce((result, chunkResult) => deepmerge(result, chunkResult))
  );

  return lastValueFrom(result$);
};

/**
 * Support functions for reduceAsyncChunks
 */
const bufferUntil = <TItem>(
  predicate: (chunk: TItem[], currentItem: TItem) => boolean
): OperatorFunction<TItem, TItem[]> => {
  return (source) =>
    new Observable((observer) => {
      let chunk: TItem[] = [];

      return source.subscribe({
        next(currentItem) {
          if (predicate(chunk, currentItem)) {
            chunk.push(currentItem);
          } else {
            // Emit the current chunk, start a new one
            if (chunk.length > 0) observer.next(chunk);
            chunk = [currentItem]; // Reset the chunk with the current item
          }
        },
        complete() {
          // Emit the final chunk if it has any items
          if (chunk.length > 0) observer.next(chunk);
          observer.complete();
        },
      });
    });
};

const isLessThanMaxChunkLength = (chunk: string[], currentItem: string) => {
  const totalLength = [...chunk, currentItem].join().length;
  return totalLength <= MAX_CHUNK_LENGTH; // Allow the chunk until it exceeds the max chunk length
};
