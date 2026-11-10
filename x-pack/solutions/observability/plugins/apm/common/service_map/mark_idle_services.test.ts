/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceNodeData } from './types';
import { markIdleServices } from './mark_idle_services';

function serviceNode(id: string, extra: Partial<ServiceNodeData> = {}): ServiceMapNode {
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

function stats(
  throughput: number,
  overrides: Partial<NonNullable<ServiceNodeData['stats']>> = {}
): NonNullable<ServiceNodeData['stats']> {
  return {
    throughput,
    transactionType: 'request',
    failedTransactionRate: null,
    latency: null,
    requestCount: 100,
    ...overrides,
  };
}

function isIdleFlags(nodes: ServiceMapNode[]): boolean[] {
  return nodes.map((node) => Boolean(node.data.isIdle));
}

/** Busy peers so a quiet service sits under the idle threshold (median ~100 → threshold 10). */
function withBusyPeers(quiet: ServiceMapNode): ServiceMapNode[] {
  return [
    serviceNode('busy-a', { stats: stats(100) }),
    serviceNode('busy-b', { stats: stats(100) }),
    quiet,
  ];
}

describe('markIdleServices', () => {
  it('leaves nodes unchanged when no service has throughput', () => {
    const nodes = [serviceNode('a'), serviceNode('b'), dependencyNode('db')];

    expect(markIdleServices(nodes)).toBe(nodes);
  });

  it('fades services far below the map typical service, whatever the absolute rate', () => {
    // Sorted: 0.01, 0.2, 0.25, 0.3 → median 0.25 → threshold 0.025 → only 0.01 is idle
    const quiet = [0.2, 0.3, 0.25, 0.01].map((throughput, i) =>
      serviceNode(`s${i}`, { stats: stats(throughput, { requestCount: 1 }) })
    );

    expect(isIdleFlags(markIdleServices(quiet))).toEqual([false, false, false, true]);
  });

  it('does not mark services when all throughputs are equal', () => {
    const nodes = [10, 10, 10].map((throughput, i) =>
      serviceNode(`s${i}`, { stats: stats(throughput) })
    );

    expect(isIdleFlags(markIdleServices(nodes))).toEqual([false, false, false]);
  });

  it('ignores dependency nodes and services without stats when computing the median', () => {
    const nodes = [
      dependencyNode('postgres'),
      serviceNode('busy', { stats: stats(100, { requestCount: 1000 }) }),
      serviceNode('quiet', { stats: stats(5, { requestCount: 50 }) }),
      serviceNode('no-stats'),
    ];

    // Median of [5, 100] → 100 → threshold 10 → quiet (5) is idle
    const marked = markIdleServices(nodes);
    expect(marked[0].data).not.toHaveProperty('isIdle');
    expect(marked[1].data.isIdle).toBeUndefined();
    expect(marked[2].data.isIdle).toBe(true);
    expect(marked[3].data).not.toHaveProperty('isIdle');
  });

  it('does not fade a quiet service that fails 5% or more with enough requests', () => {
    const marked = markIdleServices(
      withBusyPeers(
        serviceNode('failing', {
          stats: stats(5, { failedTransactionRate: 0.13, requestCount: 40 }),
        })
      )
    );

    expect(marked[2].data.isIdle).toBeUndefined();
  });

  it('still fades a quiet service with a high failure rate on fewer than 20 requests', () => {
    const marked = markIdleServices(
      withBusyPeers(
        serviceNode('noisy', {
          stats: stats(5, { failedTransactionRate: 0.5, requestCount: 4 }),
        })
      )
    );

    expect(marked[2].data.isIdle).toBe(true);
  });

  it('does not fade a quiet service with a major or critical anomaly', () => {
    const major = markIdleServices(
      withBusyPeers(
        serviceNode('major', {
          stats: stats(5),
          serviceAnomalyStats: {
            jobId: 'job',
            transactionType: 'request',
            actualValue: 1,
            anomalyScore: 50,
          },
        })
      )
    );
    const critical = markIdleServices(
      withBusyPeers(
        serviceNode('critical', {
          stats: stats(5),
          serviceAnomalyStats: {
            jobId: 'job',
            transactionType: 'request',
            actualValue: 1,
            anomalyScore: 75,
          },
        })
      )
    );

    expect(major[2].data.isIdle).toBeUndefined();
    expect(critical[2].data.isIdle).toBeUndefined();
  });

  it('does not fade a quiet service with alerts or a violated SLO when already on the node', () => {
    const withAlert = markIdleServices(
      withBusyPeers(serviceNode('alerted', { stats: stats(5), alertsCount: 1 }))
    );
    const withSlo = markIdleServices(
      withBusyPeers(serviceNode('slo', { stats: stats(5), sloStatus: 'violated', sloCount: 1 }))
    );

    expect(withAlert[2].data.isIdle).toBeUndefined();
    expect(withSlo[2].data.isIdle).toBeUndefined();
  });
});
