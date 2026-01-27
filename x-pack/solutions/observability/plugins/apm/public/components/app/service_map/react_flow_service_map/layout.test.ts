/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge } from '@xyflow/react';
import { applyDagreLayout } from './layout';
import { NODE_WIDTH, NODE_HEIGHT } from './constants';

interface TestNodeData extends Record<string, unknown> {
  label: string;
}

function createNode(id: string, label: string): Node<TestNodeData> {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label },
  };
}

function createEdge(source: string, target: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
  };
}

describe('applyDagreLayout', () => {
  describe('with empty input', () => {
    it('should return empty array for empty nodes', () => {
      const result = applyDagreLayout([], []);
      expect(result).toEqual([]);
    });
  });

  describe('with single node', () => {
    it('should position a single node', () => {
      const nodes = [createNode('a', 'Node A')];
      const edges: Edge[] = [];

      const result = applyDagreLayout(nodes, edges);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
      expect(result[0].position).toBeDefined();
      expect(typeof result[0].position.x).toBe('number');
      expect(typeof result[0].position.y).toBe('number');
    });
  });

  describe('with linear chain', () => {
    it('should position nodes in a horizontal line (LR layout)', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges = [createEdge('a', 'b'), createEdge('b', 'c')];

      const result = applyDagreLayout(nodes, edges, { rankdir: 'LR' });

      expect(result).toHaveLength(3);

      // In LR layout, x should increase from a -> b -> c
      const nodeA = result.find((n) => n.id === 'a')!;
      const nodeB = result.find((n) => n.id === 'b')!;
      const nodeC = result.find((n) => n.id === 'c')!;

      expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
      expect(nodeB.position.x).toBeLessThan(nodeC.position.x);
    });

    it('should position nodes in a vertical line (TB layout)', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges = [createEdge('a', 'b'), createEdge('b', 'c')];

      const result = applyDagreLayout(nodes, edges, { rankdir: 'TB' });

      expect(result).toHaveLength(3);

      // In TB layout, y should increase from a -> b -> c
      const nodeA = result.find((n) => n.id === 'a')!;
      const nodeB = result.find((n) => n.id === 'b')!;
      const nodeC = result.find((n) => n.id === 'c')!;

      expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
      expect(nodeB.position.y).toBeLessThan(nodeC.position.y);
    });
  });

  describe('with branching graph', () => {
    it('should position nodes with multiple targets', () => {
      //     ┌─► B
      // A ──┤
      //     └─► C
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges = [createEdge('a', 'b'), createEdge('a', 'c')];

      const result = applyDagreLayout(nodes, edges, { rankdir: 'LR' });

      const nodeA = result.find((n) => n.id === 'a')!;
      const nodeB = result.find((n) => n.id === 'b')!;
      const nodeC = result.find((n) => n.id === 'c')!;

      // A should be to the left of both B and C
      expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
      expect(nodeA.position.x).toBeLessThan(nodeC.position.x);

      // B and C should be at the same x position (same rank)
      expect(nodeB.position.x).toBe(nodeC.position.x);

      // B and C should have different y positions
      expect(nodeB.position.y).not.toBe(nodeC.position.y);
    });
  });

  describe('with disconnected nodes', () => {
    it('should position nodes even without edges', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges: Edge[] = [];

      const result = applyDagreLayout(nodes, edges);

      expect(result).toHaveLength(3);

      // All nodes should have positions
      result.forEach((node) => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });
    });
  });

  describe('with edges referencing non-existent nodes', () => {
    it('should ignore edges with missing source or target', () => {
      const nodes = [createNode('a', 'Node A'), createNode('b', 'Node B')];
      const edges = [
        createEdge('a', 'b'), // Valid
        createEdge('a', 'missing'), // Invalid target
        createEdge('missing', 'b'), // Invalid source
      ];

      // Should not throw
      const result = applyDagreLayout(nodes, edges);

      expect(result).toHaveLength(2);
    });
  });

  describe('with custom options', () => {
    it('should use custom node dimensions', () => {
      const nodes = [createNode('a', 'Node A'), createNode('b', 'Node B')];
      const edges = [createEdge('a', 'b')];

      const customWidth = 300;
      const customHeight = 100;

      const result = applyDagreLayout(nodes, edges, {
        nodeWidth: customWidth,
        nodeHeight: customHeight,
      });

      // Positions should be calculated with custom dimensions
      expect(result).toHaveLength(2);
      result.forEach((node) => {
        expect(node.position).toBeDefined();
      });
    });

    it('should use custom spacing', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges = [createEdge('a', 'b'), createEdge('b', 'c')];

      const result = applyDagreLayout(nodes, edges, {
        ranksep: 200,
        nodesep: 100,
      });

      const nodeA = result.find((n) => n.id === 'a')!;
      const nodeB = result.find((n) => n.id === 'b')!;

      // With larger ranksep, nodes should be further apart
      const distance = Math.abs(nodeB.position.x - nodeA.position.x);
      expect(distance).toBeGreaterThan(NODE_WIDTH);
    });
  });

  describe('node data preservation', () => {
    it('should preserve original node data', () => {
      const nodes: Node<TestNodeData>[] = [
        {
          id: 'a',
          position: { x: 0, y: 0 },
          type: 'service',
          data: { label: 'Node A', customField: 'value' },
        },
      ];

      const result = applyDagreLayout(nodes, []);

      expect(result[0].type).toBe('service');
      expect(result[0].data.label).toBe('Node A');
      expect(result[0].data.customField).toBe('value');
    });
  });

  describe('position calculation', () => {
    it('should center nodes based on width and height', () => {
      const nodes = [createNode('a', 'Node A')];

      const result = applyDagreLayout(nodes, [], {
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
      });

      // Position should be adjusted by half width/height
      expect(result[0].position.x).toBeDefined();
      expect(result[0].position.y).toBeDefined();
    });

    it('should return integer positions', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges = [createEdge('a', 'b'), createEdge('a', 'c')];

      const result = applyDagreLayout(nodes, edges);

      result.forEach((node) => {
        expect(Number.isInteger(node.position.x)).toBe(true);
        expect(Number.isInteger(node.position.y)).toBe(true);
      });
    });
  });
});
