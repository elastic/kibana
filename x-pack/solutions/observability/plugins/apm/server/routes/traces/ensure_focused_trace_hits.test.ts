/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import { ensureFocusedTraceHits, getTraceHitId } from './ensure_focused_trace_hits';

function createHit({ id, parentId }: { id: string; parentId?: string }): {
  fields: Record<string, unknown>;
} {
  return {
    fields: {
      [SPAN_ID]: [id],
      [TRANSACTION_ID]: [id],
      ...(parentId ? { [PARENT_ID]: [parentId] } : {}),
    },
  };
}

describe('getTraceHitId', () => {
  it('prefers span.id over transaction.id', () => {
    expect(
      getTraceHitId({
        fields: {
          [SPAN_ID]: ['span-1'],
          [TRANSACTION_ID]: ['txn-1'],
        },
      })
    ).toBe('span-1');
  });

  it('falls back to transaction.id', () => {
    expect(
      getTraceHitId({
        fields: {
          [TRANSACTION_ID]: ['txn-1'],
        },
      })
    ).toBe('txn-1');
  });
});

describe('ensureFocusedTraceHits', () => {
  const search = jest.fn();
  const apmEventClient = { search } as unknown as APMEventClient;

  beforeEach(() => {
    search.mockReset();
  });

  it('does not search when the focused document and ancestors are already present', async () => {
    const parent = createHit({ id: 'parent' });
    const focused = createHit({ id: 'focused', parentId: 'parent' });

    const result = await ensureFocusedTraceHits({
      apmEventClient,
      hits: [parent, focused],
      focusedDocId: 'focused',
      maxTraceItems: 2,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
    });

    expect(search).not.toHaveBeenCalled();
    expect(result.map(getTraceHitId)).toEqual(['parent', 'focused']);
  });

  it('fetches a missing focused document and drops ranked hits to stay at maxTraceItems', async () => {
    const rootA = createHit({ id: 'root-a' });
    const rootB = createHit({ id: 'root-b' });
    const focused = createHit({ id: 'focused', parentId: 'root-a' });

    search.mockResolvedValueOnce({
      hits: { hits: [focused] },
    });

    const result = await ensureFocusedTraceHits({
      apmEventClient,
      hits: [rootA, rootB],
      focusedDocId: 'focused',
      maxTraceItems: 2,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toBe('get_focused_trace_items');
    expect(result.map(getTraceHitId)).toEqual(['focused', 'root-a']);
  });

  it('walks missing ancestors after fetching the focused document', async () => {
    const rankedRoot = createHit({ id: 'other-root' });
    const parent = createHit({ id: 'parent' });
    const focused = createHit({ id: 'focused', parentId: 'parent' });

    search
      .mockResolvedValueOnce({ hits: { hits: [focused] } })
      .mockResolvedValueOnce({ hits: { hits: [parent] } });

    const result = await ensureFocusedTraceHits({
      apmEventClient,
      hits: [rankedRoot],
      focusedDocId: 'focused',
      maxTraceItems: 2,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
    });

    expect(search).toHaveBeenCalledTimes(2);
    expect(result.map(getTraceHitId)).toEqual(['focused', 'parent']);
  });

  it('fetches a missing grandparent when the parent is already on the ranked page', async () => {
    const parent = createHit({ id: 'parent', parentId: 'grandparent' });
    const filler = createHit({ id: 'filler' });
    const focused = createHit({ id: 'focused', parentId: 'parent' });
    const grandparent = createHit({ id: 'grandparent' });

    search
      .mockResolvedValueOnce({ hits: { hits: [focused] } })
      .mockResolvedValueOnce({ hits: { hits: [grandparent] } });

    const result = await ensureFocusedTraceHits({
      apmEventClient,
      hits: [parent, filler],
      focusedDocId: 'focused',
      maxTraceItems: 3,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
    });

    expect(search).toHaveBeenCalledTimes(2);
    expect(result.map(getTraceHitId)).toEqual(['focused', 'parent', 'grandparent']);
  });

  it('keeps an already ranked focused document when a missing ancestor takes a slot', async () => {
    const rootA = createHit({ id: 'root-a' });
    const rootB = createHit({ id: 'root-b' });
    const focused = createHit({ id: 'focused', parentId: 'parent' });
    const parent = createHit({ id: 'parent' });

    search.mockResolvedValueOnce({
      hits: { hits: [parent] },
    });

    const result = await ensureFocusedTraceHits({
      apmEventClient,
      hits: [rootA, rootB, focused],
      focusedDocId: 'focused',
      maxTraceItems: 3,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(result.map(getTraceHitId)).toEqual(['focused', 'parent', 'root-a']);
  });

  it('matches transaction.id only on transaction documents and ignores a child span', async () => {
    const rankedRoot = createHit({ id: 'root-a' });
    const childSpan = {
      fields: {
        [SPAN_ID]: ['child-span'],
        [TRANSACTION_ID]: ['focused'],
        [PARENT_ID]: ['focused'],
      },
    };

    search.mockResolvedValueOnce({
      hits: { hits: [childSpan] },
    });

    const result = await ensureFocusedTraceHits({
      apmEventClient,
      hits: [rankedRoot],
      focusedDocId: 'focused',
      maxTraceItems: 2,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
    });

    expect(search.mock.calls[0][1].query.bool.should).toEqual([
      {
        bool: {
          filter: [
            { terms: { [TRANSACTION_ID]: ['focused'] } },
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
          ],
        },
      },
      { terms: { [SPAN_ID]: ['focused'] } },
    ]);
    expect(result.map(getTraceHitId)).toEqual(['root-a']);
  });

  it('applies the service filter when reserving a focused document', async () => {
    const focused = createHit({ id: 'focused' });

    search.mockResolvedValueOnce({
      hits: { hits: [focused] },
    });

    await ensureFocusedTraceHits({
      apmEventClient,
      hits: [],
      focusedDocId: 'focused',
      maxTraceItems: 1,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
      ecsOnly: true,
      serviceName: 'focused-service',
    });

    expect(search.mock.calls[0][1].query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { [SERVICE_NAME]: 'focused-service' } }])
    );
  });
});
