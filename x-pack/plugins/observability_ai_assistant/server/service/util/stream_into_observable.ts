/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, filter, from, map, Observable } from 'rxjs';
import type { Readable } from 'stream';

export function streamIntoObservable(readable: Readable): Observable<string> {
  let lineBuffer = '';

  return from(readable).pipe(
    map((chunk: Buffer) => chunk.toString('utf-8')),
    map((part) => {
      const lines = (lineBuffer + part).split('\n');
      lineBuffer = lines.pop() || ''; // Keep the last incomplete line for the next chunk
      return lines;
    }),
    concatMap((lines) => lines),
    filter((line) => line.trim() !== '')
  );
}
