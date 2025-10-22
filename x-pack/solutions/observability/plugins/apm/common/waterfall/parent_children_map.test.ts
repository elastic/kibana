/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceItem } from './unified_trace_item';
import { getTraceParentChildrenMap } from './parent_children_map';

describe('getTraceParentChildrenMap', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('maps root and children correctly', () => {
    const items: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '2',
        timestampUs: 0,
        name: 'child1',
        traceId: 't1',
        duration: 50,
        serviceName: 'svcB',
        parentId: '1',
        errors: [],
      },
      {
        id: '3',
        timestampUs: 0,
        name: 'child2',
        traceId: 't1',
        duration: 30,
        serviceName: 'svcC',
        parentId: '1',
        errors: [],
      },
      {
        id: '4',
        timestampUs: 0,
        name: 'grandchild',
        traceId: 't1',
        duration: 10,
        serviceName: 'svcD',
        parentId: '2',
        errors: [],
      },
    ];

    const result = getTraceParentChildrenMap(items, false);

    expect(result.root).toEqual([expect.objectContaining({ id: '1' })]);
    expect(result['1']).toEqual([
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '3' }),
    ]);
    expect(result['2']).toEqual([expect.objectContaining({ id: '4' })]);
  });

  it('returns only root if there are no children', () => {
    const items: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: 'root',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
      },
    ];

    const result = getTraceParentChildrenMap(items, false);

    expect(result.root).toEqual([expect.objectContaining({ id: '1' })]);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('handles finding the root from filtered spans with same timestamps by checking if they are not direct children', () => {
    const child1: TraceItem = {
      id: '2',
      parentId: '1',
      timestampUs: new Date('2024-01-01T00:00:00.500Z').getTime() * 1000,
      name: 'child1',
      traceId: 't1',
      duration: 400,
      serviceName: 'svcB',
      errors: [],
    };
    const grandchild: TraceItem = {
      id: '4',
      parentId: '2',
      timestampUs: new Date('2024-01-01T00:00:01.000Z').getTime() * 1000,
      name: 'grandchild',
      traceId: 't1',
      duration: 50,
      serviceName: 'svcD',
      errors: [],
    };

    const items = [
      child1,
      { ...grandchild, timestampUs: new Date('2024-01-01T00:00:00.500Z').getTime() * 1000 },
    ];

    const result = getTraceParentChildrenMap(items, true);

    expect(result.root).toEqual([expect.objectContaining({ id: '2' })]);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles multiple roots (should only keep the last as root)', () => {
    const items: TraceItem[] = [
      {
        id: '1',
        timestampUs: 0,
        name: 'root1',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcA',
        errors: [],
      },
      {
        id: '2',
        timestampUs: 0,
        name: 'root2',
        traceId: 't1',
        duration: 100,
        serviceName: 'svcB',
        errors: [],
      },
    ];

    const result = getTraceParentChildrenMap(items, false);

    expect(result.root).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('returns an empty object for empty input', () => {
    const result = getTraceParentChildrenMap([], false);
    expect(result).toEqual({});
  });
});
