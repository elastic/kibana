/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { DURATION, KIND, SPAN_ID, TRANSACTION_ID } from '../../../common/es_fields/apm';
import { getUnifiedTraceItemsPaginated } from './get_unified_trace_items_page';

// Use a small page size so tests don't need thousands of hits
jest.mock('./get_trace_items', () => ({ MAX_ITEMS_PER_PAGE: 2 }));

const makeHit = (id: string, sort = [0, 0, id]) => ({
  fields: { [SPAN_ID]: [id] },
  sort,
  _source: {},
});

const makeTxHit = (id: string, sort = [0, 0, id]) => ({
  fields: { [TRANSACTION_ID]: [id] },
  sort,
  _source: {},
});

const makeSearchResponse = (
  hits: Array<{ fields: Record<string, string[]>; sort: (string | number)[]; _source: {} }>,
  total: number
) => ({
  hits: {
    hits,
    total: { value: total, relation: 'eq' },
  },
});

describe('getUnifiedTraceItemsPaginated', () => {
  const mockApmEventClient = {
    search: jest.fn(),
  } as unknown as APMEventClient;

  const defaultParams = {
    apmEventClient: mockApmEventClient,
    traceId: 'trace-1',
    start: 0,
    end: 1000,
    maxTraceItems: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('single page', () => {
    it('stops when hits are fewer than MAX_ITEMS_PER_PAGE', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(mockApmEventClient.search).toHaveBeenCalledTimes(1);
      expect(result.hits).toHaveLength(1);
    });

    it('stops when hits are empty', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(makeSearchResponse([], 0));

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(mockApmEventClient.search).toHaveBeenCalledTimes(1);
      expect(result.hits).toHaveLength(0);
    });

    it('stops when mergedHits reaches total', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1'), makeHit('span-2')], 2)
      );

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(mockApmEventClient.search).toHaveBeenCalledTimes(1);
      expect(result.hits).toHaveLength(2);
    });
  });

  describe('multiple pages', () => {
    it('fetches subsequent pages using search_after from last hit sort', async () => {
      (mockApmEventClient.search as jest.Mock)
        .mockResolvedValueOnce(
          makeSearchResponse(
            [makeHit('span-1', [1, 100, 'span-1']), makeHit('span-2', [1, 90, 'span-2'])],
            4
          )
        )
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-3', [1, 80, 'span-3'])], 4));

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(mockApmEventClient.search).toHaveBeenCalledTimes(2);
      expect(result.hits).toHaveLength(3);

      // Second call should include search_after from last hit of first page
      const secondCallArgs = (mockApmEventClient.search as jest.Mock).mock.calls[1][1];
      expect(secondCallArgs.search_after).toEqual([1, 90, 'span-2']);
    });

    it('accumulates hits across pages', async () => {
      (mockApmEventClient.search as jest.Mock)
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-1'), makeHit('span-2')], 4))
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-3'), makeHit('span-4')], 4));

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(result.hits).toHaveLength(4);
      expect(result.total).toBe(4);
    });
  });

  describe('maxTraceItems limit', () => {
    it('stops and truncates when maxTraceItems is reached', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1'), makeHit('span-2')], 100)
      );

      const result = await getUnifiedTraceItemsPaginated({
        ...defaultParams,
        maxTraceItems: 2,
      });

      expect(result.hits).toHaveLength(2);
      expect(result.total).toBe(100);
      expect(mockApmEventClient.search).toHaveBeenCalledTimes(1);
    });

    it('truncates hits to exactly maxTraceItems when second page overshoots the limit', async () => {
      // maxTraceItems=3, MAX_ITEMS_PER_PAGE=2
      // page 1: span-1, span-2 → 2 hits == MAX_ITEMS_PER_PAGE, paginate
      // page 2: span-3, span-4 → merged total becomes 4, exceeds maxTraceItems=3 → truncate to 3
      (mockApmEventClient.search as jest.Mock)
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-1'), makeHit('span-2')], 100))
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-3'), makeHit('span-4')], 100));

      const result = await getUnifiedTraceItemsPaginated({
        ...defaultParams,
        maxTraceItems: 3,
      });

      expect(result.hits).toHaveLength(3);
      expect(mockApmEventClient.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('deduplication', () => {
    it('deduplicates spans with the same SPAN_ID across pages', async () => {
      (mockApmEventClient.search as jest.Mock)
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-1'), makeHit('span-2')], 3))
        .mockResolvedValueOnce(
          makeSearchResponse([makeHit('span-2'), makeHit('span-3')], 3) // span-2 is a duplicate
        );

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(result.hits).toHaveLength(3); // span-1, span-2, span-3
    });

    it('deduplicates using TRANSACTION_ID when SPAN_ID is absent', async () => {
      (mockApmEventClient.search as jest.Mock)
        .mockResolvedValueOnce(makeSearchResponse([makeTxHit('tx-1'), makeTxHit('tx-2')], 3))
        .mockResolvedValueOnce(
          makeSearchResponse([makeTxHit('tx-2'), makeTxHit('tx-3')], 3) // tx-2 is a duplicate
        );

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(result.hits).toHaveLength(3); // tx-1, tx-2, tx-3
    });

    it('keeps fetching after dedup if below maxTraceItems', async () => {
      (mockApmEventClient.search as jest.Mock)
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-1'), makeHit('span-2')], 3))
        .mockResolvedValueOnce(makeSearchResponse([makeHit('span-3')], 3));

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(result.hits).toHaveLength(3);
    });

    it('drops hits with no id', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([{ fields: {}, sort: [], _source: {} }, makeHit('span-1')], 1)
      );

      const result = await getUnifiedTraceItemsPaginated(defaultParams);

      expect(result.hits).toHaveLength(1);
    });
  });

  describe('ecsOnly flag', () => {
    it('uses simple bool.filter query when ecsOnly=true', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      await getUnifiedTraceItemsPaginated({ ...defaultParams, ecsOnly: true });

      const callArgs = (mockApmEventClient.search as jest.Mock).mock.calls[0][1];
      expect(callArgs.query.bool.must).toBeUndefined();
      expect(callArgs.query.bool.filter).toBeDefined();
      expect(callArgs.query.bool.minimum_should_match).toBeUndefined();
    });

    it('uses OTel-aware must/should query when ecsOnly=false', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      await getUnifiedTraceItemsPaginated({ ...defaultParams, ecsOnly: false });

      const callArgs = (mockApmEventClient.search as jest.Mock).mock.calls[0][1];
      expect(callArgs.query.bool.must).toBeDefined();
      expect(callArgs.query.bool.minimum_should_match).toBe(1);
    });

    it('does not include OTel fields when ecsOnly=true', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      await getUnifiedTraceItemsPaginated({ ...defaultParams, ecsOnly: true });

      const callArgs = (mockApmEventClient.search as jest.Mock).mock.calls[0][1];
      expect(callArgs.fields).not.toContain(DURATION);
      expect(callArgs.fields).not.toContain(KIND);
    });

    it('includes OTel fields when ecsOnly=false', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      await getUnifiedTraceItemsPaginated({ ...defaultParams, ecsOnly: false });

      const callArgs = (mockApmEventClient.search as jest.Mock).mock.calls[0][1];
      expect(callArgs.fields).toContain(DURATION);
      expect(callArgs.fields).toContain(KIND);
    });

    it('passes skipProcessorEventFilter=false when ecsOnly=true', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      await getUnifiedTraceItemsPaginated({ ...defaultParams, ecsOnly: true });

      const options = (mockApmEventClient.search as jest.Mock).mock.calls[0][2];
      expect(options?.skipProcessorEventFilter).toBe(false);
    });

    it('passes skipProcessorEventFilter=true when ecsOnly=false', async () => {
      (mockApmEventClient.search as jest.Mock).mockResolvedValueOnce(
        makeSearchResponse([makeHit('span-1')], 1)
      );

      await getUnifiedTraceItemsPaginated({ ...defaultParams, ecsOnly: false });

      const options = (mockApmEventClient.search as jest.Mock).mock.calls[0][2];
      expect(options?.skipProcessorEventFilter).toBe(true);
    });
  });
});
