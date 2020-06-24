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
  let fullSummaryDataset: MonitorSummary[];

  const setup = async (numSummaries: number) => {
    fetched = [];
    fullSummaryDataset = makeMonitorSummaries(numSummaries);
    const chunkFetcher = mockChunkFetcher(fullSummaryDataset);
    iterator = new MonitorSummaryIterator(simpleQueryContext(), [], -1, chunkFetcher);
  };

  const fetchAllViaNext = async () => {
    while (true) {
      const got = await iterator!.next();
      if (got) {
        fetched.push(got);
      } else {
        break;
      }
    }
  }

  const fetchAllViaNextPage = async (pageSize: number) => {
    while (true) {
      const got = await iterator!.nextPage(pageSize);
      if (got) {
        got.monitorSummaries.forEach(s => fetched.push(s))
      } else {
        break;
      }
    }
  }


  describe('matching', () => {
    [
      //{ name: 'zero results', numSummaries: 0 },
      //{ name: 'one result', numSummaries: 1 },
      //{ name: 'less than chunk', numSummaries: CHUNK_SIZE - 1 },
      //{ name: 'multiple full chunks', numSummaries: CHUNK_SIZE * 3 },
      { name: 'multiple full chunks + partial', numSummaries: CHUNK_SIZE * 3 + 3 },
    ].forEach(({ name, numSummaries }) => {
      describe(`scenario given ${name}`, () => {
        beforeEach(async () => {
          await setup(numSummaries);
        });

        describe('fetching via next', () => {
          beforeEach(async () => {
            console.log("THIS SHOULD NOT HAPPEN");
            await fetchAllViaNext();
          })

          it('should receive the expected number of results', async () => {
            expect(fetched.length).toEqual(numSummaries);
          });

          it('should have no remaining pages', async () => {
            expect(await iterator!.paginationAfterCurrent()).toBeNull();
          });
        });

        describe('nextPage()', () => {
          const pageSize = 3;

          it('should fetch no more than the page size results', async () => {
            const page = await iterator!.nextPage(pageSize);
            const expectedLength = numSummaries < pageSize ? numSummaries : pageSize;
            expect(page.monitorSummaries).toHaveLength(expectedLength);
          });

          it('should return all the results if called until none remain', async () => {
            console.log("THIS IS THE TEST");
            const receivedResults: MonitorSummary[] = [];
            //while (await iterator!.peek()) {
            while (true) {
              const page = await iterator!.nextPage(pageSize);
              if (page.monitorSummaries.length === 0) {
                break
              }
              page.monitorSummaries.forEach(s => receivedResults.push(s));
            }
            expect(receivedResults.length).toEqual(fullSummaryDataset.length)
            console.log("THIS IS THE END OF THE TEST")
          });
        });
      });
    });
  });
});

const makeMonitorSummaries = (count: number): MonitorSummary[] => {
  const summaries: MonitorSummary[] = [];
  for (let i = 0; i < count; i++) {
    const id = `monitor-${i}`;

    summaries.push({
      monitor_id: id,
      state: {
        timestamp: (123+i).toString(),
        url: {},
        summaryPings: [],
        summary: { up: 1, down: 0 },
      },
    });
  }
  return summaries;
};

const mockChunkFetcher = (summaries: MonitorSummary[]): ChunkFetcher => {
  console.log("NEW CHUNK FETCHER")
  const buffer = summaries.slice(0); // Clone it since we'll modify it
  return async (
    queryContext: QueryContext,
    searchAfter: any,
    size: number
  ): Promise<ChunkResult> => {
    //console.log("CHUNK FETCH", size, buffer.length, new Error().stack)
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
