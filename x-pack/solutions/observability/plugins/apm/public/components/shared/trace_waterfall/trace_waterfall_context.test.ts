/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupByParent } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';

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
        errorCount: 0,
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
        errorCount: 0,
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
        errorCount: 0,
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
        errorCount: 0,
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
        errorCount: 0,
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
        errorCount: 0,
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
        errorCount: 0,
      },
    ];

    const result = groupByParent(items);

    expect(result['1']).toHaveLength(2);
    expect(result['1'].map((i) => i.id)).toEqual(['2', '3']);
  });
});
