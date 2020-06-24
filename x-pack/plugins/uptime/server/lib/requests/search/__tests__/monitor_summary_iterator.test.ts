/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CHUNK_SIZE,
  ChunkFetcher,
  ChunkResult,
  MonitorSummaryIterator,
} from '../monitor_summary_iterator';
import { simpleQueryContext } from './test_helpers';
import { QueryContext } from '../query_context';
import { MonitorSummary } from '../../../../../common/runtime_types';

describe('iteration', () => {
  let iterator: MonitorSummaryIterator | null = null;
  let fetched: MonitorSummary[];

  const setup = async (numGroups: number) => {
    fetched = [];
    const expectedMonitorGroups = makeMonitorGroups(numGroups);
    const chunkFetcher = mockChunkFetcher(expectedMonitorGroups);
    iterator = new MonitorSummaryIterator(simpleQueryContext(), [], -1, chunkFetcher);

    while (true) {
      const got = await iterator.next();
      if (got) {
        fetched.push(got);
      } else {
        break;
      }
    }
  };

  describe('matching', () => {
    [
      { name: 'zero results', numGroups: 0 },
      { name: 'one result', numGroups: 1 },
      { name: 'less than chunk', numGroups: CHUNK_SIZE - 1 },
      { name: 'multiple full chunks', numGroups: CHUNK_SIZE * 3 },
      { name: 'multiple full chunks + partial', numGroups: CHUNK_SIZE * 3 + 3 },
    ].forEach(({ name, numGroups }) => {
      describe(`scenario given ${name}`, () => {
        beforeEach(async () => {
          await setup(numGroups);
        });

        it('should receive the expected number of results', () => {
          expect(fetched.length).toEqual(numGroups);
        });

        it('should have no remaining pages', async () => {
          expect(await iterator!.paginationAfterCurrent()).toBeNull();
        });
      });
    });
  });
});

const makeMonitorGroups = (count: number): MonitorSummary[] => {
  const groups: MonitorSummary[] = [];
  for (let i = 0; i < count; i++) {
    const id = `monitor-${i}`;

    groups.push({
      monitor_id: id,
      state: {
        timestamp: '123',
        url: {},
        summaryPings: [],
        summary: { up: 1, down: 0 },
      },
    });
  }
  return groups;
};

const mockChunkFetcher = (groups: MonitorSummary[]): ChunkFetcher => {
  const buffer = groups.slice(0); // Clone it since we'll modify it
  return async (
    queryContext: QueryContext,
    searchAfter: any,
    size: number
  ): Promise<ChunkResult> => {
    const resultMonitorSummaries = buffer.splice(0, size);
    const resultSearchAfter =
      buffer.length === 0
        ? null
        : { monitor_id: resultMonitorSummaries[resultMonitorSummaries.length - 1].monitor_id };
    return {
      monitorSummaries: resultMonitorSummaries,
      searchAfter: resultSearchAfter,
    };
  };
};
