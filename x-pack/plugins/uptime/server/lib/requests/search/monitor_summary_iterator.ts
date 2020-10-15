/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from './query_context';
import { fetchChunk } from './fetch_chunk';
import { CursorDirection, MonitorSummary } from '../../../../common/runtime_types';
import { CursorPagination } from './types';

// Hardcoded chunk size for how many monitors to fetch at a time when querying
export const CHUNK_SIZE = 1000;

// Function that fetches a chunk of data used in iteration
export type ChunkFetcher = (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => Promise<ChunkResult>;

// Result of fetching more results from the search.
export interface ChunkResult {
  monitorSummaries: MonitorSummary[];
  searchAfter: any;
}

/**
 * This class exists to simplify the process of querying for page data. Because the raw queries responsible for fetching pages
 * pull data in `chunks`, and those chunks can be full of matches or void of results that would require additional
 * querying, this class provides a `next` function that is cleaner to call. `next` provides the next matching result,
 * which may require many subsequent fetches, while keeping the external API clean.
 */
export class MonitorSummaryIterator {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the MonitorSummary this represents.
  buffer: MonitorSummary[];
  bufferPos: number;
  searchAfter: any;
  chunkFetcher: ChunkFetcher;
  endOfResults: boolean; // true if we've hit the end of results from ES

  constructor(
    queryContext: QueryContext,
    initialBuffer: MonitorSummary[] = [],
    initialBufferPos: number = -1,
    chunkFetcher: ChunkFetcher = fetchChunk
  ) {
    this.queryContext = queryContext;
    this.buffer = initialBuffer;
    this.bufferPos = initialBufferPos;
    this.searchAfter = queryContext.pagination.cursorKey;
    this.chunkFetcher = chunkFetcher;
    this.endOfResults = false;
  }

  // Fetch the next matching result.
  async next(): Promise<MonitorSummary | null> {
    await this.bufferNext();

    const found = this.buffer[this.bufferPos + 1];
    if (found) {
      this.bufferPos++;
      return found;
    }
    return null;
  }

  async nextPage(size: number): Promise<MonitorSummariesPage> {
    const monitorSummaries: MonitorSummary[] = [];
    let paginationBefore: CursorPagination | null = null;
    while (monitorSummaries.length < size) {
      const monitor = await this.next();
      if (!monitor) {
        break; // No more items to fetch
      }
      monitorSummaries.push(monitor);

      // We want the before pagination to be before the first item we encounter
      if (monitorSummaries.length === 1) {
        paginationBefore = await this.paginationBeforeCurrent();
      }
    }

    // We have to create these objects before checking if we can navigate backward
    const paginationAfter = await this.paginationAfterCurrent();

    const ssAligned = this.queryContext.searchSortAligned();

    if (!ssAligned) {
      monitorSummaries.reverse();
    }

    return {
      monitorSummaries,
      nextPagePagination: ssAligned ? paginationAfter : paginationBefore,
      prevPagePagination: ssAligned ? paginationBefore : paginationAfter,
    };
  }

  // Look ahead to see if there are additional results.
  async peek(): Promise<MonitorSummary | null> {
    await this.bufferNext();
    return this.buffer[this.bufferPos + 1] || null;
  }

  // Returns the last item fetched with next(). null if no items fetched with
  // next or if next has not yet been invoked.
  getCurrent(): MonitorSummary | null {
    return this.buffer[this.bufferPos] || null;
  }

  // Attempts to buffer at most `size` number of additional results, stopping when at least one additional
  // result is buffered or there are no more matching items to be found.
  async bufferNext(): Promise<void> {
    // Nothing to do if there are no more results or
    // the next element is already buffered.
    if (this.buffer[this.bufferPos + 1]) {
      return;
    }

    while (!this.endOfResults) {
      const result = await this.attemptBufferMore();
      if (result.gotHit) {
        return;
      }
    }
  }

  /**
   *  Attempts to buffer more results fetching a single chunk.
   * If trim is set to true, which is the default, it will delete all items in the buffer prior to the current item.
   * to free up space.
   * @param size the number of items to chunk
   */
  async attemptBufferMore(): Promise<{ gotHit: boolean }> {
    // Trim the buffer to just the current element since we'll be fetching more
    const current = this.getCurrent();

    // Trim the buffer to free space before fetching more
    // We only need to do this if there is actually something in the buffer.
    // This also behaves correctly in the -1 case for bufferPos, where we don't want to make it 0.
    if (current) {
      this.buffer = [current];
      this.bufferPos = 0;
    }

    const results = await this.chunkFetcher(this.queryContext, this.searchAfter, CHUNK_SIZE);
    // If we've hit the end of the stream searchAfter will be empty
    results.monitorSummaries.forEach((ms: MonitorSummary) => this.buffer.push(ms));
    if (results.searchAfter) {
      this.searchAfter = results.searchAfter;
    }

    // Remember, the chunk fetcher might return no results in one chunk, but still have more matching
    // results, so we use the searchAfter field to determine whether we keep going.
    if (!results.searchAfter) {
      this.endOfResults = true;
    }

    return {
      gotHit: results.monitorSummaries.length > 0,
    };
  }

  // Get a CursorPaginator object that will resume after the current() value.
  async paginationAfterCurrent(): Promise<CursorPagination | null> {
    const peek = await this.peek();
    if (!peek) {
      return null;
    }

    const current = this.getCurrent();
    if (!current) {
      return null;
    }
    const cursorKey = { monitor_id: current.monitor_id };

    return Object.assign({}, this.queryContext.pagination, { cursorKey });
  }

  // Get a CursorPaginator object that will resume before the current() value.
  async paginationBeforeCurrent(): Promise<CursorPagination | null> {
    const reverseFetcher = await this.reverse();
    return reverseFetcher && (await reverseFetcher.paginationAfterCurrent());
  }

  // Returns a copy of this fetcher that goes backwards from the current position
  reverse(): MonitorSummaryIterator | null {
    const reverseContext = this.queryContext.clone();
    const current = this.getCurrent();

    reverseContext.pagination = {
      cursorKey: current ? { monitor_id: current.monitor_id } : null,
      sortOrder: this.queryContext.pagination.sortOrder,
      cursorDirection:
        this.queryContext.pagination.cursorDirection === CursorDirection.AFTER
          ? CursorDirection.BEFORE
          : CursorDirection.AFTER,
    };

    return current
      ? new MonitorSummaryIterator(reverseContext, [current], 0, this.chunkFetcher)
      : null;
  }

  // Returns a copy of this with a shallow copied buffer. Note that the queryContext is still shared!
  clone() {
    return new MonitorSummaryIterator(this.queryContext, this.buffer.slice(0), this.bufferPos);
  }
}

export interface MonitorSummariesPage {
  monitorSummaries: MonitorSummary[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}
