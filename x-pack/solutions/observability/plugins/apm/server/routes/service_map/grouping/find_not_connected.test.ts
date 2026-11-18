/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findNotConnected } from './find_not_connected';
import type { WeightedEdge } from './types';

const edge = (source: string, target: string): WeightedEdge => ({ source, target, weight: 1 });

describe('findNotConnected', () => {
  it('finds services with no calls, and pieces of 3 or fewer cut off from the rest', () => {
    const notConnected = findNotConnected({
      services: ['alone', 'pair-a', 'pair-b', 'trio-a', 'trio-b', 'trio-c', 'w', 'x', 'y', 'z'],
      edges: [
        edge('pair-a', 'pair-b'),
        edge('trio-a', 'trio-b'),
        edge('trio-b', 'trio-c'),
        edge('w', 'x'),
        edge('x', 'y'),
        edge('y', 'z'),
      ],
    });

    expect(notConnected).toEqual(
      new Set(['alone', 'pair-a', 'pair-b', 'trio-a', 'trio-b', 'trio-c'])
    );
  });

  it('checks its edges, throwing on one to a service that is not being grouped', () => {
    expect(() => findNotConnected({ services: ['a', 'b'], edges: [edge('a', 'auth')] })).toThrow(
      'Edge a - auth'
    );
  });
});
