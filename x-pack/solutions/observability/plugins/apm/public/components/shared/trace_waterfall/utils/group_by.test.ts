/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from './group_by';

describe('groupBy', () => {
  it('returns an empty object when given an empty array', () => {
    const result = groupBy([], (item: any) => item.key);
    expect(result).toEqual({});
  });

  it('returns object with one key for a single item', () => {
    const items = [{ id: '1', type: 'A' }];
    const result = groupBy(items, (item) => item.type);

    expect(result).toEqual({
      A: [{ id: '1', type: 'A' }],
    });
  });

  it('groups multiple items with the same key correctly', () => {
    const items = [
      { id: '1', type: 'A' },
      { id: '2', type: 'A' },
      { id: '3', type: 'A' },
    ];
    const result = groupBy(items, (item) => item.type);

    expect(result).toEqual({
      A: [
        { id: '1', type: 'A' },
        { id: '2', type: 'A' },
        { id: '3', type: 'A' },
      ],
    });
  });

  it('creates separate groups for items with different keys', () => {
    const items = [
      { id: '1', type: 'A' },
      { id: '2', type: 'B' },
      { id: '3', type: 'C' },
    ];
    const result = groupBy(items, (item) => item.type);

    expect(result).toEqual({
      A: [{ id: '1', type: 'A' }],
      B: [{ id: '2', type: 'B' }],
      C: [{ id: '3', type: 'C' }],
    });
  });

  it('maintains order of items within groups', () => {
    const items = [
      { id: '1', type: 'A', order: 1 },
      { id: '2', type: 'B', order: 2 },
      { id: '3', type: 'A', order: 3 },
      { id: '4', type: 'B', order: 4 },
      { id: '5', type: 'A', order: 5 },
    ];
    const result = groupBy(items, (item) => item.type);

    expect(result).toEqual({
      A: [
        { id: '1', type: 'A', order: 1 },
        { id: '3', type: 'A', order: 3 },
        { id: '5', type: 'A', order: 5 },
      ],
      B: [
        { id: '2', type: 'B', order: 2 },
        { id: '4', type: 'B', order: 4 },
      ],
    });

    // Verify order is maintained
    expect(result.A[0].order).toBe(1);
    expect(result.A[1].order).toBe(3);
    expect(result.A[2].order).toBe(5);
  });

  it('works with complex key extraction functions', () => {
    const items = [
      { id: '1', nested: { value: 'key1' } },
      { id: '2', nested: { value: 'key2' } },
      { id: '3', nested: { value: 'key1' } },
    ];
    const result = groupBy(items, (item) => item.nested.value);

    expect(result).toEqual({
      key1: [
        { id: '1', nested: { value: 'key1' } },
        { id: '3', nested: { value: 'key1' } },
      ],
      key2: [{ id: '2', nested: { value: 'key2' } }],
    });
  });

  it('handles numeric IDs converted to strings', () => {
    interface Item {
      id: string;
      value: number;
    }

    const items: Item[] = [
      { id: '1', value: 100 },
      { id: '2', value: 200 },
      { id: '1', value: 150 },
    ];
    const result = groupBy(items, (item) => item.id);

    expect(result).toEqual({
      '1': [
        { id: '1', value: 100 },
        { id: '1', value: 150 },
      ],
      '2': [{ id: '2', value: 200 }],
    });
  });

  it('works with number keys', () => {
    const items = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 25 },
    ];
    const result = groupBy(items, (item) => item.age);

    expect(result).toEqual({
      25: [
        { name: 'Alice', age: 25 },
        { name: 'Charlie', age: 25 },
      ],
      30: [{ name: 'Bob', age: 30 }],
    });
  });

  it('works with symbol keys', () => {
    const symbolA = Symbol('A');
    const symbolB = Symbol('B');

    const items = [
      { id: '1', symbol: symbolA },
      { id: '2', symbol: symbolB },
      { id: '3', symbol: symbolA },
    ];
    const result = groupBy(items, (item) => item.symbol);

    expect(result[symbolA]).toEqual([
      { id: '1', symbol: symbolA },
      { id: '3', symbol: symbolA },
    ]);
    expect(result[symbolB]).toEqual([{ id: '2', symbol: symbolB }]);
  });
});
