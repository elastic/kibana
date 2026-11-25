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
  GROUP_BOX_PADDING,
  GROUP_BOX_HEADER_HEIGHT,
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

  describe('with nodes of different sizes', () => {
    it('keeps a bigger node clear of the ranks around it', () => {
      const nodes = [createNode('a', 'A'), createNode('big', 'Big'), createNode('c', 'C')];
      const edges = [createEdge('a', 'big'), createEdge('big', 'c')];
      const nodeSizes = new Map([['big', { width: 600, height: 300 }]]);

      const [a, big, c] = applyDagreLayout(nodes, edges, { rankdir: 'LR' }, undefined, nodeSizes);

      expect(big.position.x).toBeGreaterThanOrEqual(a.position.x + NODE_WIDTH + RANK_SEPARATION);
      expect(c.position.x).toBeGreaterThanOrEqual(big.position.x + 600 + RANK_SEPARATION);
    });

    it('centres nodes of different sizes on the same rank axis', () => {
      const nodes = [createNode('root', 'Root'), createNode('big', 'Big'), createNode('c', 'C')];
      const edges = [createEdge('root', 'big'), createEdge('root', 'c')];
      const nodeSizes = new Map([['big', { width: 600, height: 300 }]]);

      const [, big, c] = applyDagreLayout(nodes, edges, { rankdir: 'LR' }, undefined, nodeSizes);

      expect(Math.abs(big.position.x + 300 - (c.position.x + NODE_WIDTH / 2))).toBeLessThanOrEqual(
        1
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

    it('leaves room for a node bigger than the default in the grid fallback', () => {
      const nodes = [
        createNode('a', 'Node A'),
        createNode('b', 'Node B'),
        createNode('c', 'Node C'),
      ];
      const nodeSizes = new Map([['a', { width: 600, height: 300 }]]);

      const result = applyDagreLayout(nodes, [], {}, undefined, nodeSizes);

      expect(result[1].position.x).toBe(GRAPH_MARGIN + 600 + NODE_SEPARATION);
      expect(result[2].position.y).toBe(GRAPH_MARGIN + 300 + RANK_SEPARATION);
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

  it('gives a rank holding a bigger node the room it needs, in both band directions', () => {
    const bigWidth = 700;
    const { nodes: line, edges } = positionedLine(20, 'LR');
    // Dagre centres the ranks on the same axis, so a wider node starts earlier and pushes the rest on.
    const bigIds = ['n1', 'n5'];
    const nodeSizes = new Map(bigIds.map((id) => [id, { width: bigWidth, height: NODE_HEIGHT }]));
    let shift = 0;
    const nodes = line.map((node) => {
      const isBig = nodeSizes.has(node.id);
      const positioned = {
        ...node,
        position: { x: node.position.x + shift - (isBig ? (bigWidth - NODE_WIDTH) / 2 : 0), y: 0 },
      };
      shift += isBig ? bigWidth - NODE_WIDTH : 0;
      return positioned;
    });

    const result = foldWideLayout(nodes, edges, resolveOptions({ rankdir: 'LR' }), nodeSizes);

    expect(distinctValues(result.map((n) => n.position.y))).toBeGreaterThan(1);

    const widthOf = (id: string) => (nodeSizes.has(id) ? bigWidth : NODE_WIDTH);
    const sameBand = result.filter((node) => node.position.y === result[0].position.y);
    const bySpan = [...sameBand].sort((a, b) => a.position.x - b.position.x);
    bySpan.slice(1).forEach((node, index) => {
      const previous = bySpan[index];
      expect(node.position.x).toBeGreaterThanOrEqual(
        previous.position.x + widthOf(previous.id) + RANK_SEPARATION - 1
      );
    });

    // n5 is in the second, reversed band; it must clear its neighbours there too.
    const n5 = result.find(({ id }) => id === 'n5');
    const secondBand = result
      .filter((node) => node.position.y === n5?.position.y && node.id !== 'n5')
      .map((node) => ({ node, right: node.position.x + widthOf(node.id) }));
    secondBand.forEach(({ node, right }) => {
      const overlaps =
        node.position.x < (n5?.position.x ?? 0) + bigWidth && right > (n5?.position.x ?? 0);
      expect(overlaps).toBe(false);
    });
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

describe('applyServiceMapLayout with open groups', () => {
  const member = (id: string, boxId: string): Node<TestNodeData> => ({
    ...createNode(id, id),
    parentId: boxId,
  });

  const box = (id: string): Node<TestNodeData> => createNode(id, id);

  const byId = <T extends Node>(nodes: T[]) => new Map(nodes.map((node) => [node.id, node]));

  const overlaps = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  const nodes = [
    createNode('before', 'before'),
    box('box'),
    member('m1', 'box'),
    member('m2', 'box'),
    member('m3', 'box'),
    createNode('after', 'after'),
  ];
  const edges = [
    createEdge('before', 'm1'),
    createEdge('m1', 'm2'),
    createEdge('m2', 'm3'),
    createEdge('m3', 'after'),
  ];

  it('keeps the input order, so the box comes before its members', () => {
    const result = applyServiceMapLayout(nodes, edges, { rankdir: 'LR' });

    expect(result.map(({ id }) => id)).toEqual(nodes.map(({ id }) => id));
    expect(result.filter(({ parentId }) => parentId).map(({ parentId }) => parentId)).toEqual([
      'box',
      'box',
      'box',
    ]);
  });

  it('sizes the box to fit its members, below a header and inside padding', () => {
    const result = byId(applyServiceMapLayout(nodes, edges, { rankdir: 'LR' }));
    const boxNode = result.get('box');

    // Three members in a row (LR): three nodes wide and one tall.
    expect(boxNode?.width).toBe(3 * NODE_WIDTH + 2 * RANK_SEPARATION + 2 * GROUP_BOX_PADDING);
    expect(boxNode?.height).toBe(NODE_HEIGHT + 2 * GROUP_BOX_PADDING + GROUP_BOX_HEADER_HEIGHT);
  });

  it('positions members relative to the box and inside it', () => {
    const result = byId(applyServiceMapLayout(nodes, edges, { rankdir: 'LR' }));
    const { width = 0, height = 0 } = result.get('box') ?? {};

    for (const id of ['m1', 'm2', 'm3']) {
      const { position } = result.get(id) as Node;
      expect(position.x).toBeGreaterThanOrEqual(GROUP_BOX_PADDING);
      expect(position.y).toBeGreaterThanOrEqual(GROUP_BOX_PADDING + GROUP_BOX_HEADER_HEIGHT);
      expect(position.x + NODE_WIDTH).toBeLessThanOrEqual(width - GROUP_BOX_PADDING);
      expect(position.y + NODE_HEIGHT).toBeLessThanOrEqual(height - GROUP_BOX_PADDING);
    }
  });

  it('lays the members out by the calls between them', () => {
    const result = byId(applyServiceMapLayout(nodes, edges, { rankdir: 'LR' }));

    const xs = ['m1', 'm2', 'm3'].map((id) => (result.get(id) as Node).position.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(xs).size).toBe(3);
  });

  it('keeps the services around the box in order and clear of it', () => {
    const result = byId(applyServiceMapLayout(nodes, edges, { rankdir: 'LR' }));
    const boxNode = result.get('box') as Node;
    const before = result.get('before') as Node;
    const after = result.get('after') as Node;
    const rect = (node: Node, width: number, height: number) => ({
      ...node.position,
      width,
      height,
    });
    const boxRect = rect(boxNode, boxNode.width ?? 0, boxNode.height ?? 0);

    // `before` calls a member and `after` is called by one, so they sit on either side of the box.
    expect(before.position.x + NODE_WIDTH).toBeLessThanOrEqual(boxNode.position.x);
    expect(after.position.x).toBeGreaterThanOrEqual(boxNode.position.x + (boxNode.width ?? 0));
    expect(overlaps(rect(before, NODE_WIDTH, NODE_HEIGHT), boxRect)).toBe(false);
    expect(overlaps(rect(after, NODE_WIDTH, NODE_HEIGHT), boxRect)).toBe(false);
  });

  it('keeps the services on the same line as the box, as when the group is closed', () => {
    const result = byId(applyServiceMapLayout(nodes, edges, { rankdir: 'LR' }));
    const boxNode = result.get('box') as Node;
    const boxCentre = boxNode.position.y + (boxNode.height ?? 0) / 2;

    for (const id of ['before', 'after']) {
      const { position } = result.get(id) as Node;
      expect(Math.abs(position.y + NODE_HEIGHT / 2 - boxCentre)).toBeLessThanOrEqual(1);
    }
  });

  it('lays out two open groups side by side without overlap', () => {
    const twoGroups = [
      box('a'),
      member('a1', 'a'),
      member('a2', 'a'),
      box('b'),
      member('b1', 'b'),
      member('b2', 'b'),
    ];
    const result = byId(
      applyServiceMapLayout(twoGroups, [createEdge('a1', 'a2'), createEdge('a2', 'b1')], {
        rankdir: 'TB',
      })
    );
    const rect = (id: string) => {
      const node = result.get(id) as Node;
      return { ...node.position, width: node.width ?? 0, height: node.height ?? 0 };
    };

    expect(overlaps(rect('a'), rect('b'))).toBe(false);
    expect(result.get('a2')?.position.y).toBeGreaterThan(result.get('a1')?.position.y ?? 0);
  });

  it('lays a group with a single member out like any other open group', () => {
    const result = byId(
      applyServiceMapLayout([box('a'), member('a1', 'a')], [], { rankdir: 'LR' })
    );

    expect(result.get('a')?.width).toBe(NODE_WIDTH + 2 * GROUP_BOX_PADDING);
    expect(result.get('a1')?.position).toEqual({
      x: GROUP_BOX_PADDING,
      y: GROUP_BOX_PADDING + GROUP_BOX_HEADER_HEIGHT,
    });
  });

  it('lays out a member whose box is not in the map as a plain node', () => {
    const orphan = member('orphan', 'missing');

    const [result] = applyServiceMapLayout([orphan], [], { rankdir: 'LR' });

    expect(result.position).toEqual({ x: GRAPH_MARGIN, y: GRAPH_MARGIN });
  });

  it('folds a long chain around an open group without overlapping it', () => {
    const chain = Array.from({ length: 20 }, (_, i) => createNode(`n${i}`, `n${i}`));
    const chainEdges = Array.from({ length: 19 }, (_, i) => createEdge(`n${i}`, `n${i + 1}`));
    const withGroup = [
      ...chain.slice(0, 10),
      box('box'),
      member('m1', 'box'),
      member('m2', 'box'),
      ...chain.slice(10),
    ];
    const edgesWithGroup = [
      ...chainEdges.slice(0, 9),
      createEdge('n9', 'm1'),
      createEdge('m1', 'm2'),
      createEdge('m2', 'n10'),
      ...chainEdges.slice(10),
    ];

    const result = applyServiceMapLayout(withGroup, edgesWithGroup, { rankdir: 'LR' });
    const topLevel = result.filter(({ parentId }) => !parentId);
    const rects = topLevel.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.width ?? NODE_WIDTH,
      height: node.height ?? NODE_HEIGHT,
    }));

    expect(distinctValues(rects.map(({ y }) => y))).toBeGreaterThan(1);
    rects.forEach((a, i) => {
      rects.slice(i + 1).forEach((b) => {
        expect(overlaps(a, b)).toBe(false);
      });
    });
  });
});
