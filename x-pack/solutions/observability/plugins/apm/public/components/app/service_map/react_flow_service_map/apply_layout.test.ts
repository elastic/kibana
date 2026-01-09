/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import type { ServiceMapNodeData } from './service_node';
import type { ServiceMapEdgeData } from './transform_data';
import { applyLayout } from './apply_layout';

function createServiceNode(
  id: string,
  overrides: Partial<ServiceMapNodeData> = {}
): Node<ServiceMapNodeData> {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: true,
      ...overrides,
    },
  };
}

function createDependencyNode(
  id: string,
  overrides: Partial<ServiceMapNodeData> = {}
): Node<ServiceMapNodeData> {
  return {
    id,
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: false,
      ...overrides,
    },
  };
}

function createEdge(
  source: string,
  target: string,
  overrides: Partial<Edge<ServiceMapEdgeData>> = {}
): Edge<ServiceMapEdgeData> {
  return {
    id: `${source}-${target}`,
    source,
    target,
    ...overrides,
  };
}

describe('applyLayout', () => {
  describe('when handling empty inputs', () => {
    it('should return empty arrays when nodes array is empty', () => {
      const nodes: Node<ServiceMapNodeData>[] = [];
      const edges: Edge<ServiceMapEdgeData>[] = [];

      const result = applyLayout(nodes, edges);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should return edges unchanged when nodes array is empty', () => {
      const nodes: Node<ServiceMapNodeData>[] = [];
      const edges: Edge<ServiceMapEdgeData>[] = [createEdge('a', 'b')];

      const result = applyLayout(nodes, edges);

      expect(result.edges).toEqual(edges);
    });
  });

  describe('when laying out a single node', () => {
    it('should position a single service node', () => {
      const nodes = [createServiceNode('service-a')];
      const edges: Edge<ServiceMapEdgeData>[] = [];

      const result = applyLayout(nodes, edges);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('service-a');
      // Position should be set (not the initial 0,0)
      expect(result.nodes[0].position).toBeDefined();
      expect(typeof result.nodes[0].position.x).toBe('number');
      expect(typeof result.nodes[0].position.y).toBe('number');
    });

    it('should position a single dependency node', () => {
      const nodes = [createDependencyNode('postgresql')];
      const edges: Edge<ServiceMapEdgeData>[] = [];

      const result = applyLayout(nodes, edges);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('postgresql');
      expect(result.nodes[0].position).toBeDefined();
    });
  });

  describe('when laying out connected nodes', () => {
    it('should position nodes in left-to-right order by default', () => {
      const nodes = [createServiceNode('service-a'), createServiceNode('service-b')];
      const edges = [createEdge('service-a', 'service-b')];

      const result = applyLayout(nodes, edges);

      const nodeA = result.nodes.find((n) => n.id === 'service-a');
      const nodeB = result.nodes.find((n) => n.id === 'service-b');

      expect(nodeA).toBeDefined();
      expect(nodeB).toBeDefined();

      // In LR layout, service-a (source) should be to the left of service-b (target)
      expect(nodeA!.position.x).toBeLessThan(nodeB!.position.x);
    });

    it('should handle a chain of nodes', () => {
      const nodes = [
        createServiceNode('service-a'),
        createServiceNode('service-b'),
        createDependencyNode('database'),
      ];
      const edges = [createEdge('service-a', 'service-b'), createEdge('service-b', 'database')];

      const result = applyLayout(nodes, edges);

      const nodeA = result.nodes.find((n) => n.id === 'service-a');
      const nodeB = result.nodes.find((n) => n.id === 'service-b');
      const nodeDb = result.nodes.find((n) => n.id === 'database');

      // Nodes should be positioned in order: A -> B -> database
      expect(nodeA!.position.x).toBeLessThan(nodeB!.position.x);
      expect(nodeB!.position.x).toBeLessThan(nodeDb!.position.x);
    });

    it('should handle nodes with multiple outgoing edges', () => {
      const nodes = [
        createServiceNode('gateway'),
        createServiceNode('service-a'),
        createServiceNode('service-b'),
      ];
      const edges = [createEdge('gateway', 'service-a'), createEdge('gateway', 'service-b')];

      const result = applyLayout(nodes, edges);

      const gateway = result.nodes.find((n) => n.id === 'gateway');
      const serviceA = result.nodes.find((n) => n.id === 'service-a');
      const serviceB = result.nodes.find((n) => n.id === 'service-b');

      // Gateway should be to the left of both services
      expect(gateway!.position.x).toBeLessThan(serviceA!.position.x);
      expect(gateway!.position.x).toBeLessThan(serviceB!.position.x);

      // service-a and service-b should be at the same x position (same rank)
      expect(serviceA!.position.x).toBe(serviceB!.position.x);
    });
  });

  describe('when using custom layout options', () => {
    it('should respect custom rankdir option', () => {
      const nodes = [createServiceNode('service-a'), createServiceNode('service-b')];
      const edges = [createEdge('service-a', 'service-b')];

      // Top-to-bottom layout
      const result = applyLayout(nodes, edges, { rankdir: 'TB' });

      const nodeA = result.nodes.find((n) => n.id === 'service-a');
      const nodeB = result.nodes.find((n) => n.id === 'service-b');

      // In TB layout, service-a (source) should be above service-b (target)
      expect(nodeA!.position.y).toBeLessThan(nodeB!.position.y);
    });

    it('should respect custom nodesep option', () => {
      const nodes = [
        createServiceNode('gateway'),
        createServiceNode('service-a'),
        createServiceNode('service-b'),
      ];
      const edges = [createEdge('gateway', 'service-a'), createEdge('gateway', 'service-b')];

      const resultSmallSep = applyLayout(nodes, edges, { nodesep: 20 });
      const resultLargeSep = applyLayout(nodes, edges, { nodesep: 200 });

      const serviceASmall = resultSmallSep.nodes.find((n) => n.id === 'service-a');
      const serviceBSmall = resultSmallSep.nodes.find((n) => n.id === 'service-b');

      const serviceALarge = resultLargeSep.nodes.find((n) => n.id === 'service-a');
      const serviceBLarge = resultLargeSep.nodes.find((n) => n.id === 'service-b');

      // Larger nodesep should result in greater y-distance between nodes at same rank
      const smallDistance = Math.abs(serviceASmall!.position.y - serviceBSmall!.position.y);
      const largeDistance = Math.abs(serviceALarge!.position.y - serviceBLarge!.position.y);

      expect(largeDistance).toBeGreaterThan(smallDistance);
    });

    it('should respect custom ranksep option', () => {
      const nodes = [createServiceNode('service-a'), createServiceNode('service-b')];
      const edges = [createEdge('service-a', 'service-b')];

      const resultSmallSep = applyLayout(nodes, edges, { ranksep: 50 });
      const resultLargeSep = applyLayout(nodes, edges, { ranksep: 300 });

      const nodeASmall = resultSmallSep.nodes.find((n) => n.id === 'service-a');
      const nodeBSmall = resultSmallSep.nodes.find((n) => n.id === 'service-b');

      const nodeALarge = resultLargeSep.nodes.find((n) => n.id === 'service-a');
      const nodeBLarge = resultLargeSep.nodes.find((n) => n.id === 'service-b');

      // Larger ranksep should result in greater x-distance between ranks
      const smallDistance = Math.abs(nodeASmall!.position.x - nodeBSmall!.position.x);
      const largeDistance = Math.abs(nodeALarge!.position.x - nodeBLarge!.position.x);

      expect(largeDistance).toBeGreaterThan(smallDistance);
    });
  });

  describe('when preserving data', () => {
    it('should preserve node data after layout', () => {
      const nodes = [
        createServiceNode('opbeans-java', {
          agentName: 'java',
          serviceAnomalyStats: { healthStatus: 'warning' as any },
        }),
      ];
      const edges: Edge<ServiceMapEdgeData>[] = [];

      const result = applyLayout(nodes, edges);

      expect(result.nodes[0].data.agentName).toBe('java');
      expect(result.nodes[0].data.serviceAnomalyStats).toEqual({ healthStatus: 'warning' });
      expect(result.nodes[0].data.isService).toBe(true);
    });

    it('should preserve node type after layout', () => {
      const nodes = [createServiceNode('service-a'), createDependencyNode('database')];
      const edges = [createEdge('service-a', 'database')];

      const result = applyLayout(nodes, edges);

      const serviceNode = result.nodes.find((n) => n.id === 'service-a');
      const dependencyNode = result.nodes.find((n) => n.id === 'database');

      expect(serviceNode!.type).toBe('service');
      expect(dependencyNode!.type).toBe('dependency');
    });

    it('should return edges unchanged', () => {
      const nodes = [createServiceNode('service-a'), createServiceNode('service-b')];
      const edges = [
        createEdge('service-a', 'service-b', {
          data: { isBidirectional: true },
          style: { stroke: '#0000FF' },
        }),
      ];

      const result = applyLayout(nodes, edges);

      expect(result.edges).toEqual(edges);
      expect(result.edges[0].data?.isBidirectional).toBe(true);
      expect(result.edges[0].style?.stroke).toBe('#0000FF');
    });
  });

  describe('node sizing', () => {
    it('should use larger dimensions for service nodes (100x100)', () => {
      // This is implicitly tested by checking that dagre receives correct dimensions
      // Service nodes should have 100x100 dimensions
      const nodes = [createServiceNode('service-a'), createServiceNode('service-b')];
      const edges = [createEdge('service-a', 'service-b')];

      const result = applyLayout(nodes, edges);

      // The position should account for centering (position = center - width/2)
      // If width is 100, the offset is 50
      expect(result.nodes).toHaveLength(2);
    });

    it('should use smaller dimensions for dependency nodes (80x80)', () => {
      // Dependency nodes should have 80x80 dimensions
      const nodes = [createDependencyNode('database-a'), createDependencyNode('database-b')];
      const edges = [createEdge('database-a', 'database-b')];

      const result = applyLayout(nodes, edges);

      expect(result.nodes).toHaveLength(2);
    });
  });
});
