/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { UnifiedTraceErrors } from './get_unified_trace_errors';
import { getErrorsByDocId, getUnifiedTraceItems } from './get_unified_trace_items';
import type { APMConfig } from '../..';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';

jest.mock('./get_unified_trace_errors');
jest.mock('../span_links/get_linked_children');

import { getUnifiedTraceErrors } from './get_unified_trace_errors';
import { getSpanLinksCountById } from '../span_links/get_linked_children';
import {
  AT_TIMESTAMP,
  EVENT_OUTCOME,
  KIND,
  OTEL_SPAN_LINKS_TRACE_ID,
  PARENT_ID,
  SERVICE_NAME,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_LINKS_TRACE_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  STATUS_CODE,
  TIMESTAMP_US,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
} from '../../../common/es_fields/apm';

describe('getErrorsByDocId', () => {
  it('groups errors by doc id from apmErrors and unprocessedOtelErrors', () => {
    const unifiedTraceErrors = {
      apmErrors: [
        { spanId: 'a', id: 'error-1' },
        { spanId: 'a', id: 'error-2' },
        { spanId: 'b', id: 'error-3' },
        { spanId: undefined, id: 'error-4' },
      ],
      unprocessedOtelErrors: [
        { spanId: 'a', id: 'error-5' },
        { spanId: 'c', id: 'error-6' },
        { spanId: undefined, id: 'error-7' },
      ],
      totalErrors: 7,
    } as UnifiedTraceErrors;

    const result = getErrorsByDocId(unifiedTraceErrors);

    expect(result).toEqual({
      a: [{ errorDocId: 'error-1' }, { errorDocId: 'error-2' }, { errorDocId: 'error-5' }],
      b: [{ errorDocId: 'error-3' }],
      c: [{ errorDocId: 'error-6' }],
    });
  });

  it('returns an empty object if there are no errors', () => {
    const unifiedTraceErrors = {
      apmErrors: [],
      unprocessedOtelErrors: [],
      totalErrors: 0,
    } as UnifiedTraceErrors;

    expect(getErrorsByDocId(unifiedTraceErrors)).toEqual({});
  });

  it('ignores errors with undefined ids', () => {
    const unifiedTraceErrors = {
      apmErrors: [{ spanId: undefined, id: 'error-1' }],
      unprocessedOtelErrors: [{ spanId: undefined, id: 'error-2' }],
      totalErrors: 0,
    } as unknown as UnifiedTraceErrors;

    expect(getErrorsByDocId(unifiedTraceErrors)).toEqual({});
  });
});

describe('getUnifiedTraceItems', () => {
  const mockApmEventClient = {
    search: jest.fn(),
  } as unknown as APMEventClient;

  const mockLogsClient = {} as LogsClient;

  const mockConfig = {
    ui: {
      maxTraceItems: 1000,
    },
  } as APMConfig;

  const defaultParams = {
    apmEventClient: mockApmEventClient,
    logsClient: mockLogsClient,
    traceId: 'test-trace-id',
    start: 0,
    end: 1000,
    config: mockConfig,
  };

  const mockUnifiedTraceErrors: UnifiedTraceErrors = {
    apmErrors: [{ spanId: 'span-1', id: 'error-1', error: { id: 'error-1' } }],
    unprocessedOtelErrors: [],
    totalErrors: 1,
  };

  const defaultSearchFields = {
    [AT_TIMESTAMP]: ['2023-01-01T00:00:00.000Z'],
    [TRACE_ID]: ['test-trace-id'],
    [SERVICE_NAME]: ['test-service'],
    [TIMESTAMP_US]: [1672531200000000],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getUnifiedTraceErrors as jest.Mock).mockResolvedValue(mockUnifiedTraceErrors);
    (getSpanLinksCountById as jest.Mock).mockResolvedValue({});
  });

  describe('basic functionality', () => {
    it('should return trace items and unified trace errors', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result).toEqual({
        traceItems: [
          {
            id: 'span-1',
            name: 'Test Span',
            timestampUs: 1672531200000000,
            traceId: 'test-trace-id',
            duration: 1000,
            status: undefined,
            errors: [{ errorDocId: 'error-1' }],
            parentId: undefined,
            serviceName: 'test-service',
            type: undefined,
            spanLinksCount: {
              incoming: 0,
              outgoing: 0,
            },
          },
        ],
        unifiedTraceErrors: mockUnifiedTraceErrors,
      });
    });

    it('should call all required functions with correct parameters', async () => {
      const mockSearchResponse = {
        hits: { hits: [] },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      await getUnifiedTraceItems(defaultParams);

      expect(getUnifiedTraceErrors).toHaveBeenCalledWith({
        apmEventClient: mockApmEventClient,
        logsClient: mockLogsClient,
        traceId: 'test-trace-id',
        start: 0,
        end: 1000,
      });

      expect(getSpanLinksCountById).toHaveBeenCalledWith({
        traceId: 'test-trace-id',
        apmEventClient: mockApmEventClient,
        start: 0,
        end: 1000,
      });

      expect(mockApmEventClient.search).toHaveBeenCalledWith(
        'get_unified_trace_items',
        expect.objectContaining({
          apm: {
            events: ['span', 'transaction'],
          },
          track_total_hits: true,
          size: 1000,
        }),
        { skipProcessorEventFilter: true }
      );
    });

    it('should use maxTraceItemsFromUrlParam when provided', async () => {
      const mockSearchResponse = {
        hits: { hits: [] },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      await getUnifiedTraceItems({
        ...defaultParams,
        maxTraceItemsFromUrlParam: 500,
      });

      expect(mockApmEventClient.search).toHaveBeenCalledWith(
        'get_unified_trace_items',
        expect.objectContaining({
          size: 500,
        }),
        { skipProcessorEventFilter: true }
      );
    });

    it('should include serviceName in query when provided', async () => {
      const mockSearchResponse = {
        hits: { hits: [] },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      await getUnifiedTraceItems({
        ...defaultParams,
        serviceName: 'specific-service',
      });

      expect(mockApmEventClient.search).toHaveBeenCalledWith(
        'get_unified_trace_items',
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({
                  bool: expect.objectContaining({
                    filter: expect.arrayContaining([
                      { term: { 'service.name': 'specific-service' } },
                    ]),
                  }),
                }),
              ]),
            }),
          }),
        }),
        { skipProcessorEventFilter: true }
      );
    });
  });

  describe('trace item mapping', () => {
    it('should handle transaction fields correctly', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [TRANSACTION_ID]: ['transaction-1'],
                [TRANSACTION_NAME]: ['Test Transaction'],
                [TRANSACTION_DURATION]: [2000],
                [PARENT_ID]: ['parent-1'],
                [EVENT_OUTCOME]: ['success'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0]).toMatchObject({
        id: 'transaction-1',
        name: 'Test Transaction',
        duration: 2000,
        parentId: 'parent-1',
        status: {
          fieldName: 'event.outcome',
          value: 'success',
        },
      });
    });

    it('should handle span type, subtype, and kind fields', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
                [SPAN_TYPE]: ['db'],
                [SPAN_SUBTYPE]: ['mysql'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0]).toMatchObject({
        type: 'mysql',
      });
    });

    it('should prioritize span.subtype over span.type', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
                [SPAN_TYPE]: ['db'],
                [SPAN_SUBTYPE]: ['mysql'],
                [KIND]: ['client'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].type).toBe('mysql');
    });

    it('should use status.code when event.outcome is not available', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
                [STATUS_CODE]: ['OK'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].status).toEqual({
        fieldName: 'status.code',
        value: 'OK',
      });
    });

    it('should filter out items without id', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems).toHaveLength(0);
    });

    it('should filter out items without name', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems).toHaveLength(0);
    });

    it('should use @timestamp when timestamp.us is not available', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      // 2023-01-01T00:00:00.000Z in microseconds
      expect(result.traceItems[0].timestampUs).toBe(1672531200000000);
    });
  });

  describe('span links integration', () => {
    it('should include incoming span links count from getSpanLinksCountById', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);
      (getSpanLinksCountById as jest.Mock).mockResolvedValue({
        'span-1': 3,
      });

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].spanLinksCount).toEqual({
        incoming: 3,
        outgoing: 0,
      });
    });

    it('should include outgoing span links count from span.links.trace.id', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
                [SPAN_LINKS_TRACE_ID]: ['link-1', 'link-2'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].spanLinksCount).toEqual({
        incoming: 0,
        outgoing: 2,
      });
    });

    it('should include outgoing span links count from links.trace_id', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
                [OTEL_SPAN_LINKS_TRACE_ID]: ['link-1', 'link-2', 'link-3'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].spanLinksCount).toEqual({
        incoming: 0,
        outgoing: 3,
      });
    });

    it('should combine incoming and outgoing span links counts', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
                [SPAN_LINKS_TRACE_ID]: ['link-1', 'link-2'],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);
      (getSpanLinksCountById as jest.Mock).mockResolvedValue({
        'span-1': 5,
      });

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].spanLinksCount).toEqual({
        incoming: 5,
        outgoing: 2,
      });
    });
  });

  describe('error mapping', () => {
    it('should map errors to correct span ids', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-1'],
                [SPAN_NAME]: ['Test Span 1'],
                [SPAN_DURATION]: [1000],
              },
            },
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-2'],
                [SPAN_NAME]: ['Test Span 2'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      const mockUnifiedTraceErrorsWithMultiple = {
        apmErrors: [
          { spanId: 'span-1', id: 'error-1' },
          { spanId: 'span-1', id: 'error-2' },
        ],
        unprocessedOtelErrors: [{ spanId: 'span-2', id: 'error-3' }],
        totalErrors: 3,
      } as unknown as UnifiedTraceErrors;

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);
      (getUnifiedTraceErrors as jest.Mock).mockResolvedValue(mockUnifiedTraceErrorsWithMultiple);

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].errors).toEqual([
        { errorDocId: 'error-1' },
        { errorDocId: 'error-2' },
      ]);
      expect(result.traceItems[1].errors).toEqual([{ errorDocId: 'error-3' }]);
    });

    it('should return empty errors array for spans without errors', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              fields: {
                ...defaultSearchFields,
                [SPAN_ID]: ['span-without-error'],
                [SPAN_NAME]: ['Test Span'],
                [SPAN_DURATION]: [1000],
              },
            },
          ],
        },
      };

      (mockApmEventClient.search as jest.Mock).mockResolvedValue(mockSearchResponse);
      (getUnifiedTraceErrors as jest.Mock).mockResolvedValue({
        apmErrors: [],
        unprocessedOtelErrors: [],
        totalErrors: 0,
      });

      const result = await getUnifiedTraceItems(defaultParams);

      expect(result.traceItems[0].errors).toEqual([]);
    });
  });
});
