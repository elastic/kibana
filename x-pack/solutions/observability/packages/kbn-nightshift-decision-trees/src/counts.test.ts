/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  carryCounts,
  countsForTree,
  penalizePath,
  recordVisit,
  reinforcePath,
  resolveEdgeRefs,
  type DecisionTreeCounts,
} from './counts';
import { DecisionTreeValidationError } from './guardrails';
import { parseMermaidDecisionTree } from './mermaid';

const TREE = parseMermaidDecisionTree(
  `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|✅ yes| E2[Check deploys]
    D1 -->|no| E2
    E2 --> X1((Connection leak))
    D1 -->|unknown| X2((Escalate))`,
  'symptom:checkout-latency'
);

const MAIN_PATH = [
  { source_node_id: 'S1', target_node_id: 'E1' },
  { source_node_id: 'E1', target_node_id: 'D1' },
  { source_node_id: 'D1', target_node_id: 'E2', condition: 'yes' },
  { source_node_id: 'E2', target_node_id: 'X1' },
];

const T1 = '2026-10-21T10:00:00.000Z';
const T2 = '2026-10-21T11:00:00.000Z';

const nodeCount = (counts: DecisionTreeCounts, nodeId: string) =>
  counts.nodes.find((entry) => entry.node_id === nodeId);

const edgeCount = (
  counts: DecisionTreeCounts,
  sourceNodeId: string,
  targetNodeId: string,
  condition = 'next'
) =>
  counts.edges.find(
    (entry) =>
      entry.source_node_id === sourceNodeId &&
      entry.target_node_id === targetNodeId &&
      entry.condition === condition
  );

describe('countsForTree', () => {
  it('starts every node and edge at zero', () => {
    const counts = countsForTree(TREE);

    expect(counts.nodes).toHaveLength(TREE.nodes.length);
    expect(counts.edges).toHaveLength(TREE.edges.length);
    expect(nodeCount(counts, 'S1')).toEqual({ node_id: 'S1', visit_count: 0, reinforced_count: 0 });
  });

  it('drops counts for elements the tree no longer has', () => {
    const counts = countsForTree(TREE, {
      nodes: [{ node_id: 'GONE', visit_count: 3, reinforced_count: 1 }],
      edges: [
        {
          source_node_id: 'S1',
          target_node_id: 'GONE',
          condition: 'next',
          visit_count: 3,
          reinforced_count: 1,
        },
      ],
    });

    expect(nodeCount(counts, 'GONE')).toBeUndefined();
    expect(edgeCount(counts, 'S1', 'GONE')).toBeUndefined();
  });

  it('keeps one entry for an edge line repeated in the Mermaid', () => {
    const tree = parseMermaidDecisionTree(`flowchart TD
      S1([Symptom]) --> X1((End))
      S1 --> X1`);

    expect(countsForTree(tree).edges).toHaveLength(1);
  });
});

describe('resolveEdgeRefs', () => {
  it('ignores the condition when only one edge joins the pair', () => {
    const [edge] = resolveEdgeRefs(TREE, [
      { source_node_id: 'S1', target_node_id: 'E1', condition: 'anything' },
    ]);

    expect(edge.condition).toBe('next');
  });

  it('picks between parallel edges by condition, tolerating ✅ and case', () => {
    const [edge] = resolveEdgeRefs(TREE, [
      { source_node_id: 'D1', target_node_id: 'E2', condition: '✅ YES' },
    ]);

    expect(edge.condition).toBe('yes');
  });

  it('prefers an exact condition match over a case-insensitive one', () => {
    const tree = parseMermaidDecisionTree(
      `flowchart TD
        D1{{Retry?}} -->|yes| X1((Done))
        D1 -->|YES| X1`,
      TREE.tree_id
    );

    const [edge] = resolveEdgeRefs(tree, [
      { source_node_id: 'D1', target_node_id: 'X1', condition: 'YES' },
    ]);

    expect(edge.condition).toBe('YES');
    expect(() =>
      resolveEdgeRefs(tree, [{ source_node_id: 'D1', target_node_id: 'X1', condition: 'Yes' }])
    ).toThrow(/ambiguous/);
  });

  it('deduplicates repeated refs', () => {
    expect(resolveEdgeRefs(TREE, [MAIN_PATH[0], MAIN_PATH[0]])).toHaveLength(1);
  });

  it('rejects an edge the tree does not have', () => {
    expect(() => resolveEdgeRefs(TREE, [{ source_node_id: 'S1', target_node_id: 'X1' }])).toThrow(
      DecisionTreeValidationError
    );
    expect(() => resolveEdgeRefs(TREE, [{ source_node_id: 'S1', target_node_id: 'X1' }])).toThrow(
      /has no edge S1 --> X1/
    );
  });

  it('rejects parallel edges without a condition that picks one, listing the choices', () => {
    expect(() => resolveEdgeRefs(TREE, [{ source_node_id: 'D1', target_node_id: 'E2' }])).toThrow(
      /ambiguous; set condition to one of: "yes", "no"/
    );
    expect(() =>
      resolveEdgeRefs(TREE, [{ source_node_id: 'D1', target_node_id: 'E2', condition: 'maybe' }])
    ).toThrow(/ambiguous/);
  });
});

describe('recordVisit', () => {
  it('counts one visit on every edge of the path and every node it touches', () => {
    const counts = recordVisit({ tree: TREE, path: MAIN_PATH, now: T1 });

    for (const nodeId of ['S1', 'E1', 'D1', 'E2', 'X1']) {
      expect(nodeCount(counts, nodeId)).toMatchObject({ visit_count: 1, last_visited_at: T1 });
    }
    expect(edgeCount(counts, 'D1', 'E2', 'yes')).toMatchObject({ visit_count: 1 });
    expect(edgeCount(counts, 'D1', 'E2', 'no')).toMatchObject({ visit_count: 0 });
    expect(nodeCount(counts, 'X2')).toMatchObject({ visit_count: 0 });
  });

  it('accumulates across visits and never changes reinforcement', () => {
    const reinforced = reinforcePath({ tree: TREE, path: MAIN_PATH, now: T1 });
    const counts = recordVisit({
      tree: TREE,
      counts: recordVisit({ tree: TREE, counts: reinforced, path: MAIN_PATH, now: T1 }),
      path: MAIN_PATH,
      now: T2,
    });

    expect(nodeCount(counts, 'S1')).toEqual({
      node_id: 'S1',
      visit_count: 2,
      last_visited_at: T2,
      reinforced_count: 1,
      last_reinforced_at: T1,
    });
  });

  it('rejects a path that is not in the tree', () => {
    expect(() =>
      recordVisit({ tree: TREE, path: [{ source_node_id: 'X1', target_node_id: 'S1' }], now: T1 })
    ).toThrow(DecisionTreeValidationError);
  });
});

describe('reinforcePath and penalizePath', () => {
  it('reinforces the path by a fractional weight without counting a visit', () => {
    const counts = reinforcePath({ tree: TREE, path: MAIN_PATH, weight: 0.5, now: T1 });

    expect(edgeCount(counts, 'E2', 'X1')).toMatchObject({
      visit_count: 0,
      reinforced_count: 0.5,
      last_reinforced_at: T1,
    });
    expect(edgeCount(counts, 'D1', 'X2', 'unknown')).toMatchObject({ reinforced_count: 0 });
  });

  it('penalizes down to 0 and no further', () => {
    const reinforced = reinforcePath({ tree: TREE, path: MAIN_PATH, now: T1 });
    const counts = penalizePath({
      tree: TREE,
      counts: reinforced,
      path: MAIN_PATH,
      weight: 3,
      now: T2,
    });

    expect(nodeCount(counts, 'D1')).toMatchObject({
      reinforced_count: 0,
      last_reinforced_at: T2,
    });
    expect(
      penalizePath({ tree: TREE, path: MAIN_PATH, now: T2 }).nodes.every(
        (entry) => entry.reinforced_count === 0
      )
    ).toBe(true);
  });

  it('rejects a bad weight even on an empty path', () => {
    expect(() => reinforcePath({ tree: TREE, path: [], weight: 0, now: T1 })).toThrow(
      /positive number/
    );
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects weight %p', (weight) => {
    expect(() => reinforcePath({ tree: TREE, path: MAIN_PATH, weight, now: T1 })).toThrow(
      /positive number/
    );
    expect(() => penalizePath({ tree: TREE, path: MAIN_PATH, weight, now: T1 })).toThrow(
      /positive number/
    );
  });
});

describe('carryCounts', () => {
  const visited = recordVisit({
    tree: TREE,
    counts: reinforcePath({ tree: TREE, path: MAIN_PATH, now: T2 }),
    path: MAIN_PATH,
    now: T1,
  });

  it('keeps counts for nodes and edges that survive the edit', () => {
    const nextTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Checkout latency]) --> E1[Query error logs]
        E1 --> D1{{Pool exhausted?}}
        D1 -->|yes| E2[Check deploys]
        D1 -->|no| E2
        E2 --> X1((Connection leak))
        D1 -->|unknown| X2((Escalate))
        E2 --> E3[Diff configs]
        E3 --> X1`,
      TREE.tree_id
    );

    const counts = carryCounts({ previousTree: TREE, previousCounts: visited, nextTree });

    // A relabeled node keeps its id and therefore its counts; a new node starts at zero.
    expect(nodeCount(counts, 'E1')).toMatchObject({ visit_count: 1, reinforced_count: 1 });
    expect(nodeCount(counts, 'E3')).toMatchObject({ visit_count: 0, reinforced_count: 0 });
    // Losing ✅ in the Mermaid does not change edge identity.
    expect(edgeCount(counts, 'D1', 'E2', 'yes')).toMatchObject({ visit_count: 1 });
  });

  it('sums the counts of merged nodes into the node that absorbed them', () => {
    const previousTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> E1[Query logs]
        S1 --> E2[Search logs]
        E1 --> X1((Root cause))
        E2 --> X1`,
      TREE.tree_id
    );
    const previousCounts = recordVisit({
      tree: previousTree,
      counts: recordVisit({
        tree: previousTree,
        path: [
          { source_node_id: 'S1', target_node_id: 'E1' },
          { source_node_id: 'E1', target_node_id: 'X1' },
        ],
        now: T1,
      }),
      path: [
        { source_node_id: 'S1', target_node_id: 'E2' },
        { source_node_id: 'E2', target_node_id: 'X1' },
      ],
      now: T2,
    });
    const nextTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> E1[Query logs]
        E1 --> X1((Root cause))`,
      TREE.tree_id
    );

    const counts = carryCounts({
      previousTree,
      previousCounts,
      nextTree,
      merges: [{ from: ['E2'], into: 'E1' }],
    });

    expect(nodeCount(counts, 'E1')).toMatchObject({ visit_count: 2, last_visited_at: T2 });
    // Both S1 edges and both X1 edges collapse onto one edge each and carry the sum.
    expect(edgeCount(counts, 'S1', 'E1')).toMatchObject({ visit_count: 2 });
    expect(edgeCount(counts, 'E1', 'X1')).toMatchObject({ visit_count: 2 });
    // The symptom and terminal were each visited twice already, and merging does not double them.
    expect(nodeCount(counts, 'S1')).toMatchObject({ visit_count: 2 });
    expect(nodeCount(counts, 'E2')).toBeUndefined();
  });

  it('carries an edge whose condition was reworded when it is the only edge between its nodes', () => {
    const previousTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> D1{{Errors?}}
        D1 -->|errors high| X1((Bad deploy))
        D1 -->|errors normal| X2((No issue))`,
      TREE.tree_id
    );
    const previousCounts = recordVisit({
      tree: previousTree,
      path: [
        { source_node_id: 'S1', target_node_id: 'D1' },
        { source_node_id: 'D1', target_node_id: 'X1' },
      ],
      now: T1,
    });
    const nextTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> D1{{Errors?}}
        D1 -->|error rate above 5%| X1((Bad deploy))
        D1 -->|errors normal| X2((No issue))`,
      TREE.tree_id
    );

    const counts = carryCounts({ previousTree, previousCounts, nextTree });

    expect(edgeCount(counts, 'D1', 'X1', 'error rate above 5%')).toMatchObject({
      visit_count: 1,
    });
  });

  it('drops a reworded edge when parallel edges make the match ambiguous', () => {
    const nextTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Checkout latency]) --> E1[Query logs]
        E1 --> D1{{Pool exhausted?}}
        D1 -->|pool exhausted| E2[Check deploys]
        D1 -->|no| E2
        E2 --> X1((Connection leak))
        D1 -->|unknown| X2((Escalate))`,
      TREE.tree_id
    );

    const counts = carryCounts({ previousTree: TREE, previousCounts: visited, nextTree });

    expect(edgeCount(counts, 'D1', 'E2', 'pool exhausted')).toMatchObject({ visit_count: 0 });
  });

  describe('folding edges that no longer match exactly', () => {
    const PARALLEL = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> D1{{Pool exhausted?}}
        D1 -->|yes| E1[Check deploys]
        D1 -->|no| E1
        E1 --> X1((Root cause))`,
      TREE.tree_id
    );
    const visitedBoth = recordVisit({
      tree: PARALLEL,
      counts: recordVisit({
        tree: PARALLEL,
        path: [{ source_node_id: 'D1', target_node_id: 'E1', condition: 'yes' }],
        now: T1,
      }),
      path: [{ source_node_id: 'D1', target_node_id: 'E1', condition: 'no' }],
      now: T2,
    });

    it('sums parallel edges the agent collapsed into one new edge', () => {
      const nextTree = parseMermaidDecisionTree(
        `flowchart TD
          S1([Symptom]) --> D1{{Pool exhausted?}}
          D1 --> E1[Check deploys]
          E1 --> X1((Root cause))`,
        TREE.tree_id
      );

      const counts = carryCounts({ previousTree: PARALLEL, previousCounts: visitedBoth, nextTree });

      expect(edgeCount(counts, 'D1', 'E1')).toMatchObject({
        visit_count: 2,
        last_visited_at: T2,
      });
    });

    it('drops a deleted parallel edge rather than adding it to the edge that stayed', () => {
      const nextTree = parseMermaidDecisionTree(
        `flowchart TD
          S1([Symptom]) --> D1{{Pool exhausted?}}
          D1 -->|yes| E1[Check deploys]
          E1 --> X1((Root cause))`,
        TREE.tree_id
      );

      const counts = carryCounts({ previousTree: PARALLEL, previousCounts: visitedBoth, nextTree });

      expect(edgeCount(counts, 'D1', 'E1', 'yes')).toMatchObject({ visit_count: 1 });
    });

    it.each([
      ['keeps the surviving edge label', 'a'],
      ['keeps the merged-away edge label', 'b'],
      ['relabels the merged edge', 'a or b'],
    ])('sums differently-labelled edges a node merge collapsed when the agent %s', (_, label) => {
      const previousTree = parseMermaidDecisionTree(
        `flowchart TD
          S1([Symptom]) -->|a| E1[Query logs]
          S1 -->|b| E2[Search logs]
          E1 --> X1((Root cause))
          E2 --> X1`,
        TREE.tree_id
      );
      const previousCounts = recordVisit({
        tree: previousTree,
        counts: recordVisit({
          tree: previousTree,
          path: [{ source_node_id: 'S1', target_node_id: 'E1' }],
          now: T1,
        }),
        path: [{ source_node_id: 'S1', target_node_id: 'E2' }],
        now: T2,
      });
      const nextTree = parseMermaidDecisionTree(
        `flowchart TD
          S1([Symptom]) -->|${label}| E1[Query logs]
          E1 --> X1((Root cause))`,
        TREE.tree_id
      );

      const counts = carryCounts({
        previousTree,
        previousCounts,
        nextTree,
        merges: [{ from: ['E2'], into: 'E1' }],
      });

      expect(edgeCount(counts, 'S1', 'E1', label)).toMatchObject({ visit_count: 2 });
    });
  });

  it('clamps the reinforcement summed by a merge at 0', () => {
    const previousTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> E1[Query logs]
        S1 --> E2[Search logs]
        E1 --> X1((Root cause))
        E2 --> X1`,
      TREE.tree_id
    );
    const nextTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Symptom]) --> E1[Query logs]
        E1 --> X1((Root cause))`,
      TREE.tree_id
    );

    // Stored counts written before clamping existed can be negative; merging must not keep that.
    const counts = carryCounts({
      previousTree,
      previousCounts: {
        nodes: [
          { node_id: 'E1', visit_count: 1, reinforced_count: 1 },
          { node_id: 'E2', visit_count: 1, reinforced_count: -3 },
        ],
        edges: [],
      },
      nextTree,
      merges: [{ from: ['E2'], into: 'E1' }],
    });

    expect(nodeCount(counts, 'E1')).toMatchObject({ visit_count: 2, reinforced_count: 0 });
  });

  describe('rejects merges that would miscount', () => {
    const nextTree = parseMermaidDecisionTree(
      `flowchart TD
        S1([Checkout latency]) --> E1[Query logs]
        E1 --> X1((Connection leak))`,
      TREE.tree_id
    );

    it.each([
      [{ from: ['E2'], into: 'E9' }, /Merge target E9 is not a node of the edited tree/],
      [{ from: ['E9'], into: 'E1' }, /Merged node E9 is not a node of the previous tree/],
      [{ from: ['S1'], into: 'E1' }, /Merged node S1 still exists in the edited tree/],
    ])('%j', (merge, message) => {
      expect(() =>
        carryCounts({ previousTree: TREE, previousCounts: visited, nextTree, merges: [merge] })
      ).toThrow(message);
    });

    it('a node merged into two targets', () => {
      expect(() =>
        carryCounts({
          previousTree: TREE,
          previousCounts: visited,
          nextTree,
          merges: [
            { from: ['E2'], into: 'E1' },
            { from: ['E2'], into: 'X1' },
          ],
        })
      ).toThrow(/merged into both E1 and X1/);
    });
  });
});
