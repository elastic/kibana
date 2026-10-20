/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayEvent, ReplayEventsLoader, ReplayEventsRequest } from '../types';

export interface InMemoryLoaderOptions {
  pageSize: number;
  /** 0-based request numbers that reject once with an error, then succeed on a later attempt. */
  failOnRequests?: readonly number[];
  /** Resolves each request after this many milliseconds. */
  latencyMs?: number;
}

export interface InMemoryLoader {
  loadEvents: ReplayEventsLoader;
  /** Cursors of every request made, including failed ones, in order. */
  readonly requestedCursors: ReadonlyArray<string | undefined>;
}

/** A loader over an array: cursors are the index of the first event of the next page. */
export const createInMemoryLoader = (
  events: readonly ReplayEvent[],
  { pageSize, failOnRequests = [], latencyMs = 0 }: InMemoryLoaderOptions
): InMemoryLoader => {
  const requestedCursors: Array<string | undefined> = [];
  const failed = new Set<number>();

  const loadEvents = async ({ cursor, signal }: ReplayEventsRequest) => {
    const requestNumber = requestedCursors.length;
    requestedCursors.push(cursor);
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (signal.aborted) {
      throw new Error('aborted');
    }
    if (failOnRequests.includes(requestNumber) && !failed.has(requestNumber)) {
      failed.add(requestNumber);
      throw new Error(`request ${requestNumber} failed`);
    }
    const start = cursor === undefined ? 0 : Number(cursor);
    const end = start + pageSize;
    return {
      events: events.slice(start, end),
      nextCursor: end < events.length ? String(end) : undefined,
    };
  };

  return { loadEvents, requestedCursors };
};
