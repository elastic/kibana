/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnifiedTraceRootSpanByTraceId } from './get_unified_trace_root_span_by_trace_id';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  TRANSACTION_DURATION,
  SPAN_DURATION,
  DURATION,
  TRACE_ID,
  PARENT_ID,
  PROCESSOR_EVENT,
  SPAN_ID,
} from '../../../common/es_fields/apm';

describe('getUnifiedTraceRootSpanByTraceId', () => {
  const traceId = 'test-trace-id';
  const start = 1000000;
  const end = 2000000;

  let mockSearch: jest.Mock;

  const getMockApmEventClient = (): jest.Mocked<APMEventClient> => {
    mockSearch = jest.fn();
    return {
      search: mockSearch,
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when root transaction is found', () => {
    it('returns duration from transaction.duration.us', async () => {
      const apmEventClient = getMockApmEventClient();
      const transactionDuration = 150000; // 150ms in microseconds

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [TRANSACTION_DURATION]: [transactionDuration],
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result).toEqual({
        duration: transactionDuration,
      });
      expect(mockSearch).toHaveBeenCalledWith(
        'get_unified_trace_root_span_by_trace_id',
        expect.objectContaining({
          apm: {
            events: [ProcessorEvent.transaction, ProcessorEvent.span],
          },
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { [TRACE_ID]: traceId } }]),
              must: expect.arrayContaining([
                {
                  bool: {
                    should: [
                      {
                        constant_score: {
                          filter: {
                            bool: {
                              must_not: [{ exists: { field: PARENT_ID } }],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              ]),
              should: expect.arrayContaining([
                { terms: { [PROCESSOR_EVENT]: [ProcessorEvent.span, ProcessorEvent.transaction] } },
                { bool: { must_not: [{ exists: { field: PROCESSOR_EVENT } }] } },
              ]),
              minimum_should_match: 1,
            }),
          }),
        }),
        { skipProcessorEventFilter: true }
      );
    });
  });

  describe('when root span is found', () => {
    it('returns duration from span.duration.us', async () => {
      const apmEventClient = getMockApmEventClient();
      const spanDuration = 80000; // 80ms in microseconds

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [SPAN_DURATION]: [spanDuration],
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result).toEqual({
        duration: spanDuration,
      });
    });
  });

  describe('when OTEL unprocessed span is found', () => {
    it('returns duration converted from nanoseconds to microseconds using parseOtelDuration', async () => {
      const apmEventClient = getMockApmEventClient();
      const otelDuration = 250000000; // 250ms in nanoseconds

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [DURATION]: [otelDuration],
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      // parseOtelDuration converts nanoseconds to microseconds: 250000000 * 0.001 = 250000
      expect(result).toEqual({
        duration: 250000,
      });
    });

    it('handles OTEL duration as string', async () => {
      const apmEventClient = getMockApmEventClient();
      const otelDuration = '300000000'; // 300ms in nanoseconds as string

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [DURATION]: otelDuration,
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      // parseOtelDuration converts: parseFloat('300000000') * 0.001 = 300000
      expect(result).toEqual({
        duration: 300000,
      });
    });

    it('handles OTEL duration array', async () => {
      const apmEventClient = getMockApmEventClient();
      const otelDuration = [400000000]; // 400ms in nanoseconds as array

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [DURATION]: otelDuration,
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      // parseOtelDuration takes first element: 400000000 * 0.001 = 400000
      expect(result).toEqual({
        duration: 400000,
      });
    });
  });

  describe('when no root item is found', () => {
    it('returns undefined when hits array is empty', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when hit has no fields', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [{}],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('duration precedence', () => {
    it('prefers transaction.duration.us over span.duration.us', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [TRANSACTION_DURATION]: [100000],
                [SPAN_DURATION]: [50000],
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result?.duration).toBe(100000);
    });

    it('prefers span.duration.us over OTEL duration', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [SPAN_DURATION]: [75000],
                [DURATION]: [200000000],
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result?.duration).toBe(75000);
    });

    it('falls back to OTEL duration when APM durations are not present', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {
                [DURATION]: [180000000],
              },
            },
          ],
        },
      });

      const result = await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      expect(result?.duration).toBe(180000);
    });
  });

  describe('query structure', () => {
    it('includes range query for start and end time', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

      await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      const searchCall = mockSearch.mock.calls[0];
      const params = searchCall[1];

      // Verify range query is included (checking the structure)
      expect(params.query.bool.filter).toHaveLength(2); // traceId term + rangeQuery array
      expect(params.query.bool.filter[1]).toBeDefined();
    });

    it('requests correct fields', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

      await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      const searchCall = mockSearch.mock.calls[0];
      const params = searchCall[1];

      expect(params.fields).toEqual(
        expect.arrayContaining([TRANSACTION_DURATION, SPAN_DURATION, DURATION, SPAN_ID])
      );
    });

    it('sets size and terminate_after correctly', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

      await getUnifiedTraceRootSpanByTraceId({
        traceId,
        apmEventClient,
        start,
        end,
      });

      const searchCall = mockSearch.mock.calls[0];
      const params = searchCall[1];

      expect(params.size).toBe(1);
      expect(params.terminate_after).toBe(1);
      expect(params.track_total_hits).toBe(false);
    });
  });
});
