/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceNodeData } from './types';
import { markIdleServices } from './mark_idle_services';

function serviceNode(
  id: string,
  extra: Partial<ServiceNodeData> = {}
): ServiceMapNode {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: { id, label: id, isService: true, ...extra },
  };
}

function dependencyNode(id: string): ServiceMapNode {
  return {
    id,
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: { id, label: id, isService: false },
  };
}

function isIdleFlags(nodes: ServiceMapNode[]): boolean[] {
  return nodes.map((node) => Boolean(node.data.isIdle));
}

describe('markIdleServices', () => {
  it('leaves nodes unchanged when no service has throughput', () => {
    const nodes = [serviceNode('a'), serviceNode('b'), dependencyNode('db')];

    expect(markIdleServices(nodes)).toBe(nodes);
  });

  it('fades services far below the map typical service, whatever the absolute rate', () => {
    // Sorted: 0.01, 0.2, 0.25, 0.3 → median 0.25 → threshold 0.025 → only 0.01 is idle
    const quiet = [0.2, 0.3, 0.25, 0.01].map((throughput, i) =>
      serviceNode(`s${i}`, { stats: { throughput, transactionType: 'request', failedTransactionRate: null, latency: null, requestCount: 1 } })
    );

    expect(isIdleFlags(markIdleServices(quiet))).toEqual([false, false, false, true]);
  });

  it('does not mark services when all throughputs are equal', () => {
    const nodes = [10, 10, 10].map((throughput, i) =>
      serviceNode(`s${i}`, {
        stats: {
          throughput,
          transactionType: 'request',
          failedTransactionRate: null,
          latency: null,
          requestCount: 100,
        },
      })
    );

    expect(isIdleFlags(markIdleServices(nodes))).toEqual([false, false, false]);
  });

  it('ignores dependency nodes and services without stats when computing the median', () => {
    const nodes = [
      dependencyNode('postgres'),
      serviceNode('busy', {
        stats: {
          throughput: 100,
          transactionType: 'request',
          failedTransactionRate: null,
          latency: null,
          requestCount: 1000,
        },
      }),
      serviceNode('quiet', {
        stats: {
          throughput: 5,
          transactionType: 'request',
          failedTransactionRate: null,
          latency: null,
          requestCount: 50,
        },
      }),
      serviceNode('no-stats'),
    ];

    // Median of [5, 100] → 100 → threshold 10 → quiet (5) is idle
    const marked = markIdleServices(nodes);
    expect(marked[0].data).not.toHaveProperty('isIdle');
    expect(marked[1].data.isIdle).toBeUndefined();
    expect(marked[2].data.isIdle).toBe(true);
    expect(marked[3].data).not.toHaveProperty('isIdle');
  });
});
