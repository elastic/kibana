/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnifiedTraceSpan } from './get_unified_trace_span';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SPAN_ID, TRACE_ID, PROCESSOR_EVENT } from '../../../common/es_fields/apm';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';

jest.mock('@kbn/apm-data-access-plugin/server/utils', () => ({
  unflattenKnownApmEventFields: jest.fn(),
}));

describe('getUnifiedTraceSpan', () => {
  const spanId = 'test-span-id';
  const traceId = 'test-trace-id';

  let mockSearch: jest.Mock;
  const mockUnflattenKnownApmEventFields = unflattenKnownApmEventFields as jest.MockedFunction<
    typeof unflattenKnownApmEventFields
  >;

  const getMockApmEventClient = (): jest.Mocked<APMEventClient> => {
    mockSearch = jest.fn();
    return {
      search: mockSearch,
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when span is found', () => {
    it('returns SpanDocument with _id and _index from Elasticsearch hit', async () => {
      const apmEventClient = getMockApmEventClient();
      const mockEvent = {
        span: {
          id: spanId,
          name: 'test-span',
          duration: { us: 100000 },
        },
        trace: { id: traceId },
        service: { name: 'test-service' },
      };
      const mockId = 'es-document-id';
      const mockIndex = 'traces-apm-*';

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: mockId,
              _index: mockIndex,
              fields: {
                [SPAN_ID]: [spanId],
                [TRACE_ID]: [traceId],
              },
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce(mockEvent as any);

      const result = await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(result).toEqual({
        ...mockEvent,
        _id: mockId,
        _index: mockIndex,
      });
    });

    it('calls apmEventClient.search with correct parameters', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _index: 'test-index',
              fields: {},
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce({} as any);

      await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(mockSearch).toHaveBeenCalledWith(
        'get_unified_trace_span',
        expect.objectContaining({
          apm: {
            events: [ProcessorEvent.span, ProcessorEvent.transaction],
          },
          track_total_hits: false,
          size: 1,
          terminate_after: 1,
          fields: ['*'],
          query: {
            bool: {
              filter: [{ term: { [SPAN_ID]: spanId } }, { term: { [TRACE_ID]: traceId } }],
              should: [
                {
                  terms: {
                    [PROCESSOR_EVENT]: [ProcessorEvent.span, ProcessorEvent.transaction],
                  },
                },
                {
                  bool: {
                    must_not: {
                      exists: { field: PROCESSOR_EVENT },
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        }),
        { skipProcessorEventFilter: true }
      );
    });

    it('calls unflattenKnownApmEventFields with fields from Elasticsearch hit', async () => {
      const apmEventClient = getMockApmEventClient();
      const mockFields = {
        [SPAN_ID]: [spanId],
        [TRACE_ID]: [traceId],
        'span.name': ['test-span'],
      };

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _index: 'test-index',
              fields: mockFields,
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce({} as any);

      await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(mockUnflattenKnownApmEventFields).toHaveBeenCalledWith(mockFields, []);
    });
  });

  describe('when no span is found', () => {
    it('returns undefined when no hits are returned', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

      const result = await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(result).toBeUndefined();
      expect(mockUnflattenKnownApmEventFields).not.toHaveBeenCalled();
    });

    it('returns undefined when hit is undefined', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [undefined],
        },
      });

      const result = await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(result).toBeUndefined();
    });

    it('handles missing _id and _index gracefully', async () => {
      const apmEventClient = getMockApmEventClient();
      const mockEvent = {
        span: { id: spanId },
      };

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              fields: {},
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce(mockEvent as any);

      const result = await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(result).toEqual({
        ...mockEvent,
        _id: undefined,
        _index: undefined,
      });
    });
  });

  describe('query structure', () => {
    it('includes both span and transaction processor events', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _index: 'test-index',
              fields: {},
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce({} as any);

      await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      const callArgs = mockSearch.mock.calls[0];
      const query = callArgs[1].query.bool;

      expect(query.should).toContainEqual({
        terms: {
          [PROCESSOR_EVENT]: [ProcessorEvent.span, ProcessorEvent.transaction],
        },
      });
      expect(query.should).toContainEqual({
        bool: {
          must_not: {
            exists: { field: PROCESSOR_EVENT },
          },
        },
      });
      expect(query.minimum_should_match).toBe(1);
    });

    it('filters by both spanId and traceId', async () => {
      const apmEventClient = getMockApmEventClient();

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _index: 'test-index',
              fields: {},
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce({} as any);

      await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      const callArgs = mockSearch.mock.calls[0];
      const filter = callArgs[1].query.bool.filter;

      expect(filter).toContainEqual({ term: { [SPAN_ID]: spanId } });
      expect(filter).toContainEqual({ term: { [TRACE_ID]: traceId } });
    });
  });

  describe('when unflattenKnownApmEventFields returns null/undefined', () => {
    it('still returns SpanDocument with _id and _index when unflatten returns null', async () => {
      const apmEventClient = getMockApmEventClient();
      const mockId = 'test-id';
      const mockIndex = 'test-index';

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: mockId,
              _index: mockIndex,
              fields: {},
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce(null as any);

      const result = await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(result).toEqual({
        _id: mockId,
        _index: mockIndex,
      });
    });

    it('still returns SpanDocument with _id and _index when unflatten returns undefined', async () => {
      const apmEventClient = getMockApmEventClient();
      const mockId = 'test-id';
      const mockIndex = 'test-index';

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: mockId,
              _index: mockIndex,
              fields: {},
            },
          ],
        },
      });

      mockUnflattenKnownApmEventFields.mockReturnValueOnce(undefined as any);

      const result = await getUnifiedTraceSpan({
        spanId,
        traceId,
        apmEventClient,
      });

      expect(result).toEqual({
        _id: mockId,
        _index: mockIndex,
      });
    });
  });
});
