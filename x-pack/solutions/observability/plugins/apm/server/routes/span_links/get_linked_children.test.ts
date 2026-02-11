/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getSpanLinksCountById, getLinkedChildrenOfSpan } from './get_linked_children';

describe('get_linked_children', () => {
  const mockApmEventClient = {
    search: jest.fn(),
  } as unknown as APMEventClient;

  const defaultParams = {
    traceId: 'test-trace-id',
    apmEventClient: mockApmEventClient,
    start: 0,
    end: 1000,
  };

  const createHit = (
    spanLinks: any,
    fields: Record<string, string[]> = { 'trace.id': ['test-trace-id'], 'span.id': ['span-1'] }
  ) => ({
    _source: { span: { links: spanLinks } },
    fields,
  });

  const mockSearchWith = (hits: any[]) => {
    (mockApmEventClient.search as jest.Mock).mockResolvedValue({ hits: { hits } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpanLinksCountById', () => {
    it('should return counts for span links grouped by span id', async () => {
      mockSearchWith([
        createHit([
          { trace: { id: 'test-trace-id' }, span: { id: 'span-1' } },
          { trace: { id: 'test-trace-id' }, span: { id: 'span-2' } },
        ]),
        createHit([{ trace: { id: 'test-trace-id' }, span: { id: 'span-1' } }]),
      ]);

      const result = await getSpanLinksCountById(defaultParams);

      expect(result).toEqual({ 'span-1': 2, 'span-2': 1 });
    });

    it('should wrap single span link object in array', async () => {
      mockSearchWith([createHit({ trace: { id: 'test-trace-id' }, span: { id: 'span-1' } })]);

      const result = await getSpanLinksCountById(defaultParams);

      expect(result).toEqual({ 'span-1': 1 });
    });

    it('should filter out span links from different traces', async () => {
      mockSearchWith([
        createHit([
          { trace: { id: 'test-trace-id' }, span: { id: 'span-1' } },
          { trace: { id: 'different-trace-id' }, span: { id: 'span-2' } },
        ]),
      ]);

      const result = await getSpanLinksCountById(defaultParams);

      expect(result).toEqual({ 'span-1': 1 });
    });

    it('should return empty object when no span links found', async () => {
      mockSearchWith([]);

      const result = await getSpanLinksCountById(defaultParams);

      expect(result).toEqual({});
    });
  });

  describe('getLinkedChildrenOfSpan', () => {
    it('should return linked children for a specific span', async () => {
      mockSearchWith([
        createHit([{ trace: { id: 'test-trace-id' }, span: { id: 'target-span-id' } }], {
          'trace.id': ['test-trace-id'],
          'span.id': ['child-span-1'],
        }),
      ]);

      const result = await getLinkedChildrenOfSpan({ ...defaultParams, spanId: 'target-span-id' });

      expect(result).toEqual([{ trace: { id: 'test-trace-id' }, span: { id: 'child-span-1' } }]);
    });

    it('should wrap single span link object in array', async () => {
      mockSearchWith([
        createHit(
          { trace: { id: 'test-trace-id' }, span: { id: 'target-span-id' } },
          { 'trace.id': ['test-trace-id'], 'span.id': ['child-span-1'] }
        ),
      ]);

      const result = await getLinkedChildrenOfSpan({ ...defaultParams, spanId: 'target-span-id' });

      expect(result).toEqual([{ trace: { id: 'test-trace-id' }, span: { id: 'child-span-1' } }]);
    });

    it('should use transaction.id when span.id is not available', async () => {
      mockSearchWith([
        createHit([{ trace: { id: 'test-trace-id' }, span: { id: 'target-span-id' } }], {
          'trace.id': ['test-trace-id'],
          'transaction.id': ['transaction-1'],
        }),
      ]);

      const result = await getLinkedChildrenOfSpan({ ...defaultParams, spanId: 'target-span-id' });

      expect(result).toEqual([{ trace: { id: 'test-trace-id' }, span: { id: 'transaction-1' } }]);
    });

    it('should filter out links that do not match the target spanId', async () => {
      mockSearchWith([
        createHit(
          [
            { trace: { id: 'test-trace-id' }, span: { id: 'target-span-id' } },
            { trace: { id: 'test-trace-id' }, span: { id: 'different-span-id' } },
          ],
          { 'trace.id': ['test-trace-id'], 'span.id': ['child-span-1'] }
        ),
      ]);

      const result = await getLinkedChildrenOfSpan({ ...defaultParams, spanId: 'target-span-id' });

      expect(result).toEqual([{ trace: { id: 'test-trace-id' }, span: { id: 'child-span-1' } }]);
    });
  });
});
