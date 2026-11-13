/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WeightedEdge } from './types';
import { compareNames, edgesBetween, verifyEdges } from './utils';

describe('compareNames', () => {
  it('orders by code unit, uppercase before lowercase', () => {
    expect(['b', 'a', 'B', 'a-b', 'a_b'].sort(compareNames)).toEqual(['B', 'a', 'a-b', 'a_b', 'b']);
  });
});

describe('edgesBetween', () => {
  it('keeps only the edges whose services are both among the given ones', () => {
    const edges: WeightedEdge[] = [
      { source: 'a', target: 'b', weight: 1 },
      { source: 'a', target: 'auth', weight: 1 },
      { source: 'b', target: 'c', weight: 1 },
    ];

    expect(edgesBetween({ edges, services: new Set(['a', 'b', 'c']) })).toEqual([
      { source: 'a', target: 'b', weight: 1 },
      { source: 'b', target: 'c', weight: 1 },
    ]);
  });
});

describe('verifyEdges', () => {
  const services = new Set(['a', 'b']);

  it('accepts clean edges', () => {
    expect(() =>
      verifyEdges({ edges: [{ source: 'a', target: 'b', weight: 0.5 }], services })
    ).not.toThrow();
  });

  it('throws on an edge to a service that is not being grouped', () => {
    expect(() =>
      verifyEdges({ edges: [{ source: 'a', target: 'elsewhere', weight: 1 }], services })
    ).toThrow("Edge a - elsewhere has a service that isn't being grouped");
  });

  it('throws on an edge from a service to itself', () => {
    expect(() =>
      verifyEdges({ edges: [{ source: 'a', target: 'a', weight: 1 }], services })
    ).toThrow('Edge a - a connects a service to itself');
  });

  it.each([0, -1, NaN])('throws on an edge with weight %s', (weight) => {
    expect(() => verifyEdges({ edges: [{ source: 'a', target: 'b', weight }], services })).toThrow(
      `Edge a - b has weight ${weight}, not a positive number`
    );
  });
});
