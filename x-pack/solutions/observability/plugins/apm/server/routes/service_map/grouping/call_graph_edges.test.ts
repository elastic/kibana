/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedServiceCallGraph } from './match_service_call_graph';
import { getCallGraphEdges } from './call_graph_edges';

describe('getCallGraphEdges', () => {
  it('adds up both directions of a pair into one edge before taking the log', () => {
    const { edges } = getCallGraphEdges({
      callGraph: {
        cart: [{ service: 'checkout', calls: 30 }],
        checkout: [{ service: 'cart', calls: 69 }],
      },
      services: ['cart', 'checkout'],
    });

    expect(edges).toEqual([{ source: 'cart', target: 'checkout', weight: Math.log1p(99) }]);
  });

  it('sorts the edges by pair, whatever order the calls arrive in', () => {
    const services = ['a', 'b', 'c', 'd'];
    const forward: MatchedServiceCallGraph = {
      a: [
        { service: 'c', calls: 1 },
        { service: 'b', calls: 2 },
      ],
      d: [{ service: 'a', calls: 3 }],
    };
    const reversed: MatchedServiceCallGraph = {
      d: [{ service: 'a', calls: 3 }],
      a: [
        { service: 'b', calls: 2 },
        { service: 'c', calls: 1 },
      ],
    };

    const { edges } = getCallGraphEdges({ callGraph: forward, services });

    expect(edges.map(({ source, target }) => `${source}-${target}`)).toEqual(['a-b', 'a-c', 'a-d']);
    expect(
      getCallGraphEdges({ callGraph: reversed, services: [...services].reverse() }).edges
    ).toEqual(edges);
  });

  it('leaves out calls to services not on the map, to the service itself, and with no calls', () => {
    const { edges, stats } = getCallGraphEdges({
      callGraph: {
        cart: [
          { service: 'payment', calls: 5 },
          { service: 'cart', calls: 7 },
          { service: 'checkout', calls: 0 },
        ],
        payment: [{ service: 'checkout', calls: 4 }],
      },
      services: ['cart', 'checkout'],
    });

    expect(edges).toEqual([]);
    expect(stats.get('cart')).toEqual({ callers: 0, neighbours: 0, traffic: 0 });
    expect(stats.get('checkout')).toEqual({ callers: 0, neighbours: 0, traffic: 0 });
    expect(stats.has('payment')).toBe(false);
  });

  it('counts distinct callers, distinct neighbours and the calls made and received', () => {
    const { stats } = getCallGraphEdges({
      callGraph: {
        frontend: [
          { service: 'auth', calls: 100 },
          { service: 'cart', calls: 10 },
        ],
        cart: [
          { service: 'auth', calls: 20 },
          { service: 'frontend', calls: 1 },
        ],
      },
      services: ['auth', 'cart', 'frontend', 'idle'],
    });

    expect(stats.get('auth')).toEqual({ callers: 2, neighbours: 2, traffic: 120 });
    expect(stats.get('cart')).toEqual({ callers: 1, neighbours: 2, traffic: 31 });
    expect(stats.get('frontend')).toEqual({ callers: 1, neighbours: 2, traffic: 111 });
    expect(stats.get('idle')).toEqual({ callers: 0, neighbours: 0, traffic: 0 });
  });
});
