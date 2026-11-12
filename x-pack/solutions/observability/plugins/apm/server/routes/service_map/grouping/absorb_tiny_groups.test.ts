/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { absorbTinyGroups } from './absorb_tiny_groups';
import type { WeightedEdge } from './types';

const edge = (source: string, target: string, weight = 1): WeightedEdge => ({
  source,
  target,
  weight,
});

// two groups of 3 or more: 0 is a, b, c and 1 is w, x, y, z
const largeGroups: Array<[string, number]> = [
  ['a', 0],
  ['b', 0],
  ['c', 0],
  ['w', 1],
  ['x', 1],
  ['y', 1],
  ['z', 1],
];

describe('absorbTinyGroups', () => {
  it('moves a service in a tiny group into the neighbouring group it shares the most weight with', () => {
    const groups = absorbTinyGroups({
      groups: new Map([...largeGroups, ['tiny', 2]]),
      edges: [edge('tiny', 'a', 1), edge('tiny', 'x', 2), edge('tiny', 'y', 2)],
    });

    expect(groups.get('tiny')).toBe(1);
  });

  it('breaks a tie by the lowest group number', () => {
    const groups = absorbTinyGroups({
      groups: new Map([...largeGroups, ['tiny', 2]]),
      edges: [edge('tiny', 'x', 2), edge('tiny', 'a', 2)],
    });

    expect(groups.get('tiny')).toBe(0);
  });

  it('moves both services of a pair, each to its own strongest neighbour', () => {
    const groups = absorbTinyGroups({
      groups: new Map([...largeGroups, ['pair-a', 2], ['pair-b', 2]]),
      edges: [edge('pair-a', 'pair-b'), edge('pair-a', 'a', 3), edge('pair-b', 'z', 3)],
    });

    expect(groups.get('pair-a')).toBe(0);
    expect(groups.get('pair-b')).toBe(1);
  });

  it('leaves a tiny group whose neighbours are all in tiny groups', () => {
    const chain = new Map([
      ['a', 0],
      ['b', 0],
      ['c', 1],
      ['d', 1],
      ['e', 2],
      ['f', 2],
    ]);
    const groups = absorbTinyGroups({
      groups: chain,
      edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e'), edge('e', 'f')],
    });

    expect(groups).toEqual(chain);
  });

  it('leaves groups of 3 or more as they are', () => {
    const groups = absorbTinyGroups({
      groups: new Map(largeGroups),
      edges: [edge('a', 'x', 5), edge('b', 'c'), edge('w', 'x')],
    });

    expect(groups).toEqual(new Map(largeGroups));
  });
});
