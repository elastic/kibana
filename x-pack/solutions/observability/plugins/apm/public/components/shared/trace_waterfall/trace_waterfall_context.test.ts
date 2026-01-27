/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupByParent, filterMapByCriticalPath } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import type { CriticalPathSegment } from './critical_path';

describe('groupByParent', () => {
  it('groups items by their parentId', () => {
    const items: TraceWaterfallItem[] = [
      {
        id: '1',
        parentId: undefined,
        depth: 0,
        offset: 0,
        skew: 0,
        color: 'red',
        timestampUs: new Date('2024-01-01T00:00:00Z').getTime() * 1000,
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
      {
        id: '2',
        parentId: '1',
        depth: 1,
        offset: 10,
        skew: 0,
        color: 'blue',
        timestampUs: new Date('2024-01-01T00:00:01Z').getTime() * 1000,
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
      {
        id: '3',
        parentId: '1',
        depth: 1,
        offset: 20,
        skew: 0,
        color: 'green',
        timestampUs: new Date('2024-01-01T00:00:02Z').getTime() * 1000,
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
      {
        id: '4',
        parentId: '2',
        depth: 2,
        offset: 30,
        skew: 0,
        color: 'yellow',
        timestampUs: new Date('2024-01-01T00:00:03Z').getTime() * 1000,
        name: 'grandchild',
        traceId: 't1',
        duration: 10,
        serviceName: 'svcD',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
    ];

    const result = groupByParent(items);

    expect(result).toEqual({
      '1': [expect.objectContaining({ id: '2' }), expect.objectContaining({ id: '3' })],
      '2': [expect.objectContaining({ id: '4' })],
    });
  });

  it('returns an empty object if no items have parentId', () => {
    const items: TraceWaterfallItem[] = [
      {
        id: '1',
        parentId: undefined,
        depth: 0,
        offset: 0,
        skew: 0,
        color: 'red',
        timestampUs: new Date('2024-01-01T00:00:00Z').getTime() * 1000,
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
    ];

    const result = groupByParent(items);

    expect(result).toEqual({});
  });

  it('handles multiple children for the same parent', () => {
    const items: TraceWaterfallItem[] = [
      {
        id: '2',
        parentId: '1',
        depth: 1,
        offset: 10,
        skew: 0,
        color: 'blue',
        timestampUs: new Date('2024-01-01T00:00:01Z').getTime() * 1000,
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
      {
        id: '3',
        parentId: '1',
        depth: 1,
        offset: 20,
        skew: 0,
        color: 'green',
        timestampUs: new Date('2024-01-01T00:00:02Z').getTime() * 1000,
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
        errors: [],
        spanLinksCount: { incoming: 0, outgoing: 0 },
      },
    ];

    const result = groupByParent(items);

    expect(result['1']).toHaveLength(2);
    expect(result['1'].map((i) => i.id)).toEqual(['2', '3']);
  });
});

describe('filterMapByCriticalPath', () => {
  const mockItem = (id: string, parentId: string = 'parent'): TraceWaterfallItem => ({
    id,
    parentId,
    name: `Item ${id}`,
    traceId: 'trace1',
    timestampUs: 1000,
    duration: 100,
    depth: 0,
    offset: 0,
    skew: 0,
    color: '#fff',
    errors: [],
    spanLinksCount: { incoming: 0, outgoing: 0 },
    serviceName: 'test-service',
  });

  const mockSegment = (item: TraceWaterfallItem): CriticalPathSegment<TraceWaterfallItem> => ({
    item,
    offset: 0,
    duration: 100,
    self: true,
  });

  it('filters out children not in critical path', () => {
    const child1 = mockItem('child1');
    const child2 = mockItem('child2');
    const child3 = mockItem('child3');

    const map = {
      parent1: [child1, child2, child3],
    };

    const criticalPathSegmentsById = {
      child1: [mockSegment(child1)],
      child3: [mockSegment(child3)],
    };

    const result = filterMapByCriticalPath(map, criticalPathSegmentsById);

    expect(result.parent1).toHaveLength(2);
    expect(result.parent1.map((c: TraceWaterfallItem) => c.id)).toEqual(['child1', 'child3']);
  });

  it('returns empty array for parents with no children in critical path', () => {
    const child1 = mockItem('child1');
    const child2 = mockItem('child2');
    const child3 = mockItem('child3');

    const map = {
      parent1: [child1, child2],
    };

    const criticalPathSegmentsById = {
      child3: [mockSegment(child3)],
    };

    const result = filterMapByCriticalPath(map, criticalPathSegmentsById);

    expect(result.parent1).toEqual([]);
  });

  it('keeps all children when all are in critical path', () => {
    const child1 = mockItem('child1');
    const child2 = mockItem('child2');

    const map = {
      parent1: [child1, child2],
    };

    const criticalPathSegmentsById = {
      child1: [mockSegment(child1)],
      child2: [mockSegment(child2)],
    };

    const result = filterMapByCriticalPath(map, criticalPathSegmentsById);

    expect(result.parent1).toHaveLength(2);
    expect(result.parent1.map((c: TraceWaterfallItem) => c.id)).toEqual(['child1', 'child2']);
  });

  it('handles multiple parents', () => {
    const child1 = mockItem('child1');
    const child2 = mockItem('child2');
    const child3 = mockItem('child3');
    const child4 = mockItem('child4');

    const map = {
      parent1: [child1, child2],
      parent2: [child3, child4],
    };

    const criticalPathSegmentsById = {
      child1: [mockSegment(child1)],
      child4: [mockSegment(child4)],
    };

    const result = filterMapByCriticalPath(map, criticalPathSegmentsById);

    expect(result.parent1.map((c: TraceWaterfallItem) => c.id)).toEqual(['child1']);
    expect(result.parent2.map((c: TraceWaterfallItem) => c.id)).toEqual(['child4']);
  });

  it('returns empty map when input is empty', () => {
    const result = filterMapByCriticalPath({}, {});
    expect(result).toEqual({});
  });

  it('preserves original object references', () => {
    const child1 = mockItem('child1');
    const map = {
      parent1: [child1],
    };

    const criticalPathSegmentsById = {
      child1: [mockSegment(child1)],
    };

    const result = filterMapByCriticalPath(map, criticalPathSegmentsById);

    expect(result.parent1[0]).toBe(child1);
  });
});
