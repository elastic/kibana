/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapEdge, ServiceMapGrouping, ServiceMapNode, ServiceNodeData } from './types';
import { isServiceGroupNodeData, isServiceNodeData } from './types';
import { groupServiceNodes } from './group_service_nodes';
import { createEdgeMarker, getEdgeId } from './utils';
import { DEFAULT_EDGE_STYLE } from './constants';

/** Illustration payload (service.namespace strategy). */
const ILLUSTRATION_GROUPING: ServiceMapGrouping = {
  services: [
    'auth',
    'billing',
    'cart',
    'checkout',
    'cron-job',
    'frontend',
    'indexer',
    'ledger',
    'search',
  ],
  automatic: 'service.namespace',
  strategies: [
    {
      source: 'service.namespace',
      passes: true,
      groups: [
        { id: 'shared', kind: 'shared' },
        {
          id: 'service.namespace:shop',
          kind: 'attribute',
          attribute: 'service.namespace',
          value: 'shop',
        },
        {
          id: 'service.namespace:finance',
          kind: 'attribute',
          attribute: 'service.namespace',
          value: 'finance',
        },
        { id: 'notConnected', kind: 'notConnected' },
        { id: 'calls:search', kind: 'calls', busiestService: 'search' },
      ],
      // auth→shared, billing→finance, cart→shop, checkout→shop, cron→notConnected,
      // frontend→shop, indexer→calls:search, ledger→finance, search→calls:search
      assignment: [0, 2, 1, 1, 3, 1, 4, 2, 4],
    },
  ],
};

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

function edge(source: string, target: string, bidirectional = false): ServiceMapEdge {
  const marker = createEdgeMarker(DEFAULT_EDGE_STYLE.stroke);
  return {
    id: getEdgeId(source, target),
    source,
    target,
    type: 'default',
    style: DEFAULT_EDGE_STYLE,
    markerEnd: marker,
    ...(bidirectional ? { markerStart: marker } : {}),
    data: { isBidirectional: bidirectional },
  };
}

function illustrationNodes(): ServiceMapNode[] {
  return ILLUSTRATION_GROUPING.services.map((name) =>
    serviceNode(name, {
      stats: {
        transactionType: 'request',
        throughput: 10,
        failedTransactionRate: 0.1,
        latency: 1_000,
        requestCount: 100,
      },
    })
  );
}

describe('groupServiceNodes', () => {
  it('is a no-op without serviceGrouping', () => {
    const nodes = [serviceNode('a'), serviceNode('b')];
    const edges = [edge('a', 'b')];
    const result = groupServiceNodes(nodes, edges, undefined);
    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
  });

  it('collapses groups of 2+ and leaves singles and dependencies', () => {
    const nodes = [...illustrationNodes(), dependencyNode('postgres')];
    const edges = [
      edge('frontend', 'cart'),
      edge('cart', 'checkout'),
      edge('checkout', 'billing'),
      edge('billing', 'ledger'),
      edge('frontend', 'auth'),
      edge('search', 'indexer'),
      edge('checkout', 'postgres'),
    ];

    const { nodes: nextNodes, edges: nextEdges } = groupServiceNodes(
      nodes,
      edges,
      ILLUSTRATION_GROUPING
    );

    const groupNodes = nextNodes.filter((n) => isServiceGroupNodeData(n.data));
    const serviceNodes = nextNodes.filter((n) => isServiceNodeData(n.data));
    const deps = nextNodes.filter((n) => n.type === 'dependency');

    // shop: frontend, cart, checkout (3)
    // finance: billing, ledger (2)
    // calls:search: indexer, search (2)
    // shared: auth (1) — stays a service
    // notConnected: cron-job (1) — stays a service
    expect(groupNodes).toHaveLength(3);
    expect(serviceNodes.map((n) => n.id).sort()).toEqual(['auth', 'cron-job']);
    expect(deps).toHaveLength(1);

    const shop = groupNodes.find((n) => n.id === 'service.namespace:shop');
    expect(shop?.data).toMatchObject({
      label: 'shop',
      memberCount: 3,
      groupKind: 'attribute',
    });
    expect(isServiceGroupNodeData(shop!.data) && shop!.data.stats).toMatchObject({
      throughput: 30,
      requestCount: 300,
      failedTransactionRate: 0.1,
      latency: 1_000,
    });

    // Intra-group edges dropped; checkout→billing becomes shop→finance; checkout→postgres → shop→postgres
    const edgeKeys = nextEdges.map((e) => `${e.source}>${e.target}`).sort();
    expect(edgeKeys).toContain('service.namespace:shop>service.namespace:finance');
    expect(edgeKeys).toContain('service.namespace:shop>postgres');
    expect(edgeKeys).toContain('service.namespace:shop>auth');
    expect(edgeKeys.some((k) => k.includes('frontend') || k.includes('cart'))).toBe(false);
    expect(edgeKeys).not.toContain('search>indexer');
    expect(edgeKeys.every((k) => !k.startsWith('calls:search>calls:search'))).toBe(true);
  });

  it('keeps bidirectional markers when merging edges onto a closed group', () => {
    const grouping: ServiceMapGrouping = {
      services: ['app-a', 'app-b'],
      automatic: 'namePrefix',
      strategies: [
        {
          source: 'namePrefix',
          passes: true,
          groups: [
            {
              id: 'namePrefix:app',
              kind: 'attribute',
              attribute: 'namePrefix',
              value: 'app',
            },
          ],
          assignment: [0, 0],
        },
      ],
    };
    const nodes = [serviceNode('app-a'), serviceNode('app-b'), dependencyNode('postgres')];
    // First edge is one-way; second is both ways. Both become namePrefix:app → postgres.
    const edges = [edge('app-a', 'postgres'), edge('app-b', 'postgres', true)];

    const { edges: nextEdges } = groupServiceNodes(nodes, edges, grouping);
    const toPostgres = nextEdges.find(
      (e) => e.source === 'namePrefix:app' && e.target === 'postgres'
    );

    expect(toPostgres?.data?.isBidirectional).toBe(true);
    expect(toPostgres?.markerStart).toBeDefined();
    expect(toPostgres?.markerEnd).toBeDefined();
  });

  it('keeps the transaction type with the most requests', () => {
    const grouping: ServiceMapGrouping = {
      services: ['alpha', 'beta'],
      automatic: 'namePrefix',
      strategies: [
        {
          source: 'namePrefix',
          passes: true,
          groups: [
            {
              id: 'namePrefix:app',
              kind: 'attribute',
              attribute: 'namePrefix',
              value: 'app',
            },
          ],
          assignment: [0, 0],
        },
      ],
    };
    const nodes = [
      serviceNode('alpha', {
        stats: {
          transactionType: 'request',
          throughput: 1,
          failedTransactionRate: 0,
          latency: 100,
          requestCount: 10,
        },
      }),
      serviceNode('beta', {
        stats: {
          transactionType: 'messaging',
          throughput: 9,
          failedTransactionRate: 0,
          latency: 200,
          requestCount: 90,
        },
      }),
    ];

    const { nodes: nextNodes } = groupServiceNodes(nodes, [], grouping);
    const group = nextNodes.find((node) => isServiceGroupNodeData(node.data));

    expect(isServiceGroupNodeData(group!.data) && group!.data.stats).toMatchObject({
      transactionType: 'messaging',
      throughput: 10,
      requestCount: 100,
    });
  });

  it('rolls up alerts, SLO, and highest anomaly', () => {
    const nodes = [
      serviceNode('frontend', {
        alertsCount: 2,
        sloStatus: 'degrading',
        sloCount: 1,
        serviceAnomalyStats: { anomalyScore: 40 },
        stats: {
          transactionType: 'request',
          throughput: 10,
          failedTransactionRate: 0,
          latency: 100,
          requestCount: 50,
        },
      }),
      serviceNode('cart', {
        alertsCount: 1,
        sloStatus: 'violated',
        sloCount: 2,
        serviceAnomalyStats: { anomalyScore: 90 },
        stats: {
          transactionType: 'request',
          throughput: 5,
          failedTransactionRate: 0.2,
          latency: 500,
          requestCount: 50,
        },
      }),
      serviceNode('checkout', {
        stats: {
          transactionType: 'request',
          throughput: 5,
          failedTransactionRate: null,
          latency: 200,
          requestCount: 50,
        },
      }),
      // keep other services so assignment indices resolve
      ...ILLUSTRATION_GROUPING.services
        .filter((n) => !['frontend', 'cart', 'checkout'].includes(n))
        .map((n) => serviceNode(n)),
    ];

    const { nodes: nextNodes } = groupServiceNodes(nodes, [], ILLUSTRATION_GROUPING);
    const shop = nextNodes.find((n) => n.id === 'service.namespace:shop');
    expect(shop?.data).toMatchObject({
      alertsCount: 3,
      sloStatus: 'violated',
      sloCount: 3,
      serviceAnomalyStats: { anomalyScore: 90 },
      stats: {
        throughput: 20,
        requestCount: 150,
        failedTransactionRate: 0.1, // (0*50 + 0.2*50) / 100 — null member ignored
        latency: 500,
      },
    });
  });

  it('uses the requested strategy source when provided', () => {
    const grouping: ServiceMapGrouping = {
      services: ['a', 'b', 'c'],
      automatic: 'calls',
      strategies: [
        {
          source: 'calls',
          passes: true,
          groups: [{ id: 'calls:a', kind: 'calls', busiestService: 'a' }],
          assignment: [0, 0, 0],
        },
        {
          source: 'namePrefix',
          passes: true,
          groups: [
            { id: 'namePrefix:x', kind: 'attribute', attribute: 'namePrefix', value: 'x' },
            { id: 'namePrefix:y', kind: 'attribute', attribute: 'namePrefix', value: 'y' },
          ],
          assignment: [0, 0, 1],
        },
      ],
    };
    const nodes = [serviceNode('a'), serviceNode('b'), serviceNode('c')];

    const auto = groupServiceNodes(nodes, [], grouping);
    expect(auto.nodes.filter((n) => isServiceGroupNodeData(n.data))).toHaveLength(1);
    expect(auto.nodes.find((n) => isServiceGroupNodeData(n.data))?.data.label).toBe('a');

    const byPrefix = groupServiceNodes(nodes, [], grouping, 'namePrefix');
    expect(byPrefix.nodes.filter((n) => isServiceGroupNodeData(n.data))).toHaveLength(1);
    expect(byPrefix.nodes.find((n) => n.id === 'namePrefix:x')?.data).toMatchObject({
      label: 'x',
      memberCount: 2,
    });
    expect(byPrefix.nodes.some((n) => n.id === 'c' && isServiceNodeData(n.data))).toBe(true);
  });
});
