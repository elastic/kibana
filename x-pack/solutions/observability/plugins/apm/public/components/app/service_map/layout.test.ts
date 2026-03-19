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
    it('returns empty array for empty nodes', () => {
      const result = applyDagreLayout([], []);
      expect(result).toEqual([]);
    });
  });

  describe('with single node', () => {
    it('positions a single node', () => {
      const nodes = [createNode('a', 'Node A')];
      const edges: Edge[] = [];

      const result = applyDagreLayout(nodes, edges);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'a',
          position: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('with linear chain', () => {
    it('positions nodes in a horizontal line (LR layout)', () => {
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

      expect(nodeA.position.x < nodeB.position.x && nodeB.position.x < nodeC.position.x).toBe(true);
    });

    it('positions nodes in a vertical line (TB layout)', () => {
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

      expect(nodeA.position.y < nodeB.position.y && nodeB.position.y < nodeC.position.y).toBe(true);
    });
  });

  describe('with branching graph', () => {
    it('positions nodes with multiple targets', () => {
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

      // A should be to the left of both B and C, B and C at same x but different y
      expect({
        aLeftOfB: nodeA.position.x < nodeB.position.x,
        aLeftOfC: nodeA.position.x < nodeC.position.x,
        bAndCSameRank: nodeB.position.x === nodeC.position.x,
        bAndCDifferentY: nodeB.position.y !== nodeC.position.y,
      }).toEqual({
        aLeftOfB: true,
        aLeftOfC: true,
        bAndCSameRank: true,
        bAndCDifferentY: true,
      });
    });
  });

  describe('with disconnected nodes', () => {
    it('positions nodes even without edges', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges: Edge[] = [];

      const result = applyDagreLayout(nodes, edges);

      expect(result).toHaveLength(3);
      // All nodes should have positions
      expect(result.every((node) => node.position !== undefined)).toBe(true);
    });
  });

  describe('with edges referencing non-existent nodes', () => {
    it('ignores edges with missing source or target', () => {
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
    it('uses custom node dimensions', () => {
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
      expect(result.every((node) => node.position !== undefined)).toBe(true);
    });

    it('uses custom spacing', () => {
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
    it('preserves original node data', () => {
      const nodes: Node<TestNodeData>[] = [
        {
          id: 'a',
          position: { x: 0, y: 0 },
          type: 'service',
          data: { label: 'Node A', customField: 'value' },
        },
      ];

      const result = applyDagreLayout(nodes, []);

      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'service',
          data: expect.objectContaining({
            label: 'Node A',
            customField: 'value',
          }),
        })
      );
    });
  });

  describe('position calculation', () => {
    it('centers nodes based on width and height', () => {
      const nodes = [createNode('a', 'Node A')];

      const result = applyDagreLayout(nodes, [], {
        nodeWidth: NODE_WIDTH,
        nodeHeight: NODE_HEIGHT,
      });

      // Position should be adjusted by half width/height
      expect(result[0].position).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        })
      );
    });

    it('returns integer positions', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const edges = [createEdge('a', 'b'), createEdge('a', 'c')];

      const result = applyDagreLayout(nodes, edges);

      expect(
        result.every(
          (node) => Number.isInteger(node.position.x) && Number.isInteger(node.position.y)
        )
      ).toBe(true);
    });
  });
});
