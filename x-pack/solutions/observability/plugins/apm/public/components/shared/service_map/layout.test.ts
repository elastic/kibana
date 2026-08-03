/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';
import {
  applyDagreLayout,
  applyServiceMapLayout,
  foldWideLayout,
  type LayoutOptions,
} from './layout';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  GRAPH_MARGIN,
  NODE_SEPARATION,
  RANK_SEPARATION,
  FOLD_MIN_NODE_COUNT,
} from '../../../../common/service_map/constants';

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
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
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
      expect(nodeA.sourcePosition).toBe(Position.Right);
      expect(nodeA.targetPosition).toBe(Position.Left);
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
      expect(nodeA.sourcePosition).toBe(Position.Bottom);
      expect(nodeA.targetPosition).toBe(Position.Top);
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

  describe('when Dagre.layout throws', () => {
    let layoutSpy: jest.SpyInstance;

    beforeEach(() => {
      layoutSpy = jest.spyOn(Dagre, 'layout').mockImplementation(() => {
        throw new TypeError("Cannot read properties of undefined (reading 'weight')");
      });
    });

    afterEach(() => {
      layoutSpy.mockRestore();
    });

    it('invokes onDagreLayoutFailure with the error', () => {
      const nodes = [createNode('a', 'Node A'), createNode('b', 'Node B')];
      const onFailure = jest.fn();

      applyDagreLayout(nodes, [createEdge('a', 'b')], {}, onFailure);

      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure.mock.calls[0][0]).toBeInstanceOf(TypeError);
    });

    it('applies grid fallback positions for three nodes', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const stepX = NODE_WIDTH + NODE_SEPARATION;
      const stepY = NODE_HEIGHT + RANK_SEPARATION;

      const result = applyDagreLayout(nodes, [], {});

      expect(result).toHaveLength(3);
      expect(result[0].position).toEqual({
        x: GRAPH_MARGIN,
        y: GRAPH_MARGIN,
      });
      expect(result[1].position).toEqual({
        x: GRAPH_MARGIN + stepX,
        y: GRAPH_MARGIN,
      });
      expect(result[2].position).toEqual({
        x: GRAPH_MARGIN,
        y: GRAPH_MARGIN + stepY,
      });
    });

    it('preserves node data and type on fallback', () => {
      const nodes: Node<TestNodeData>[] = [
        {
          id: 'a',
          position: { x: 0, y: 0 },
          type: 'service',
          data: { label: 'Node A', customField: 'value' },
        },
      ];

      const result = applyDagreLayout(nodes, [], {});

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
});

function createChain(length: number): { nodes: Node<TestNodeData>[]; edges: Edge[] } {
  const nodes = Array.from({ length }, (_, i) => createNode(`n${i}`, `Node ${i}`));
  const edges = Array.from({ length: length - 1 }, (_, i) => createEdge(`n${i}`, `n${i + 1}`));
  return { nodes, edges };
}

const distinctValues = (values: number[]) => new Set(values).size;

const resolveOptions = (overrides: LayoutOptions = {}): Required<LayoutOptions> => ({
  rankdir: 'LR',
  ranksep: RANK_SEPARATION,
  nodesep: NODE_SEPARATION,
  marginx: GRAPH_MARGIN,
  marginy: GRAPH_MARGIN,
  nodeWidth: NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
  ...overrides,
});

/**
 * Builds an already-positioned single line of nodes, mimicking what Dagre produces for a chain:
 * one node per rank along the primary axis, all sharing the cross-axis coordinate.
 */
function positionedLine(
  length: number,
  rankdir: 'LR' | 'TB' = 'LR'
): { nodes: Node<TestNodeData>[]; edges: Edge[] } {
  const cellAlong = (rankdir === 'TB' ? NODE_HEIGHT : NODE_WIDTH) + RANK_SEPARATION;
  const nodes = Array.from({ length }, (_, i) => ({
    ...createNode(`n${i}`, `Node ${i}`),
    position: rankdir === 'TB' ? { x: 0, y: i * cellAlong } : { x: i * cellAlong, y: 0 },
  }));
  const edges = Array.from({ length: length - 1 }, (_, i) => createEdge(`n${i}`, `n${i + 1}`));
  return { nodes, edges };
}

describe('foldWideLayout', () => {
  it('folds a very wide line into multiple rows (LR) and shrinks the long axis', () => {
    const { nodes, edges } = positionedLine(20, 'LR');
    const widthBefore = Math.max(...nodes.map((n) => n.position.x));

    const result = foldWideLayout(nodes, edges, resolveOptions({ rankdir: 'LR' }));

    expect(distinctValues(result.map((n) => n.position.y))).toBeGreaterThan(1);
    expect(Math.max(...result.map((n) => n.position.x))).toBeLessThan(widthBefore);
  });

  it('alternates band direction and routes turn edges with rotated handles (LR)', () => {
    // 20 ranks fold into bands of 4 ranks (the near-square choice), so the first band is n0..n3.
    const { nodes, edges } = positionedLine(20, 'LR');

    const result = foldWideLayout(nodes, edges, resolveOptions({ rankdir: 'LR' }));
    const byId = new Map(result.map((n) => [n.id, n] as const));

    // Start node: enters from the left, leaves to the right (first band runs left→right).
    expect(byId.get('n0')?.targetPosition).toBe(Position.Left);
    expect(byId.get('n0')?.sourcePosition).toBe(Position.Right);

    // Last rank of the first band turns down to the next band.
    expect(byId.get('n3')?.sourcePosition).toBe(Position.Bottom);

    // First rank of the second (reversed) band is entered from above, then continues leftward.
    expect(byId.get('n4')?.targetPosition).toBe(Position.Top);
    expect(byId.get('n4')?.sourcePosition).toBe(Position.Left);
  });

  it('folds a very tall line into multiple columns (TB)', () => {
    const { nodes, edges } = positionedLine(20, 'TB');

    const result = foldWideLayout(nodes, edges, resolveOptions({ rankdir: 'TB' }));

    expect(distinctValues(result.map((n) => n.position.x))).toBeGreaterThan(1);

    const byId = new Map(result.map((n) => [n.id, n] as const));
    expect(byId.get('n0')?.targetPosition).toBe(Position.Top);
    expect(byId.get('n0')?.sourcePosition).toBe(Position.Bottom);
  });

  it('returns integer positions', () => {
    const { nodes, edges } = positionedLine(20, 'LR');

    const result = foldWideLayout(nodes, edges, resolveOptions());

    expect(
      result.every((node) => Number.isInteger(node.position.x) && Number.isInteger(node.position.y))
    ).toBe(true);
  });

  it('leaves small layouts unchanged', () => {
    const { nodes, edges } = positionedLine(FOLD_MIN_NODE_COUNT - 1, 'LR');

    const result = foldWideLayout(nodes, edges, resolveOptions());

    expect(result).toEqual(nodes);
  });

  it('leaves a roughly square layout unchanged', () => {
    // 4×4 grid: long/short axis ratio is well under the fold threshold.
    const nodes = Array.from({ length: 16 }, (_, i) => ({
      ...createNode(`n${i}`, `Node ${i}`),
      position: {
        x: (i % 4) * (NODE_WIDTH + RANK_SEPARATION),
        y: Math.floor(i / 4) * (NODE_HEIGHT + NODE_SEPARATION),
      },
    }));

    const result = foldWideLayout(nodes, [], resolveOptions());

    expect(result).toEqual(nodes);
  });

  it('does not fold when most edges span more than one rank', () => {
    const { nodes } = positionedLine(20, 'LR');
    // Hub edges from n0 reach across many ranks, so folding would create long diagonals.
    const edges = nodes.slice(1).map((n) => createEdge('n0', n.id));

    const result = foldWideLayout(nodes, edges, resolveOptions());

    expect(result).toEqual(nodes);
  });
});

describe('applyServiceMapLayout', () => {
  it('folds the Dagre output for a long chain into multiple rows (LR)', () => {
    const { nodes, edges } = createChain(20);

    const result = applyServiceMapLayout(nodes, edges, { rankdir: 'LR' });

    expect(distinctValues(result.map((n) => n.position.y))).toBeGreaterThan(1);
  });

  it('leaves Dagre output unchanged for a chain below the node threshold', () => {
    const { nodes, edges } = createChain(FOLD_MIN_NODE_COUNT - 1);

    const result = applyServiceMapLayout(nodes, edges, { rankdir: 'LR' });
    const dagreResult = applyDagreLayout(nodes, edges, { rankdir: 'LR' });

    expect(result).toEqual(dagreResult);
  });

  it('leaves Dagre output unchanged for a wide-but-shallow branching graph', () => {
    // A root fanning out to many leaves is only two ranks deep, so Dagre stacks it tall, not wide,
    // and there is nothing to fold.
    const nodes = [
      createNode('root', 'Root'),
      ...Array.from({ length: 15 }, (_, i) => createNode(`leaf${i}`, `Leaf ${i}`)),
    ];
    const edges = Array.from({ length: 15 }, (_, i) => createEdge('root', `leaf${i}`));

    const result = applyServiceMapLayout(nodes, edges, { rankdir: 'LR' });
    const dagreResult = applyDagreLayout(nodes, edges, { rankdir: 'LR' });

    expect(result).toEqual(dagreResult);
  });
});
