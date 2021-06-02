/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { bufferTime, filter as rxFilter, switchMap } from 'rxjs/operators';

export const DEFAULT_BUFFER_TIME_MS = 1000;
export const DEFAULT_BUFFER_SIZE = 100;

interface ConstructorParams<TItem> {
  maxBufferTimeMs?: number;
  maxBufferSize?: number;
  flush: (items: TItem[]) => Promise<void>;
}

// TODO: handle possible exceptions in flush and maybe add retry logic

export class BufferedStream<TItem> {
  private readonly buffer$: Subject<TItem>;
  private readonly whenBufferCompleteAndFlushed: Promise<void>;

  constructor(params: ConstructorParams<TItem>) {
    const maxBufferTime = params.maxBufferTimeMs ?? DEFAULT_BUFFER_TIME_MS;
    const maxBufferSize = params.maxBufferSize ?? DEFAULT_BUFFER_SIZE;

    this.buffer$ = new Subject<TItem>();

    // Buffer items for time/buffer length, ignore empty buffers,
    // then flush the buffered items; kick things off with a promise
    // on the observable, which we'll wait on in shutdown
    this.whenBufferCompleteAndFlushed = this.buffer$
      .pipe(
        bufferTime(maxBufferTime, null, maxBufferSize),
        rxFilter((docs) => docs.length > 0),
        switchMap(async (docs) => await params.flush(docs))
      )
      .toPromise();
  }

  public enqueue(item: TItem): void {
    this.buffer$.next(item);
  }

  public async closeAndWaitUntilFlushed(): Promise<void> {
    this.buffer$.complete();
    await this.whenBufferCompleteAndFlushed;
  }
}
