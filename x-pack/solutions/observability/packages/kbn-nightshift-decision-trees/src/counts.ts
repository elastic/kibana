/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DecisionTreeValidationError } from './guardrails';
import type { DecisionEdgeView, DecisionTreeView } from './types';

/**
 * How often a node or edge was traversed and how often it was confirmed as causal.
 *
 * Visits and reinforcement are independent: a visit never changes `reinforced_count`, and only
 * explicit reinforce or penalize operations do. `reinforced_count` is a float so weighted updates
 * accumulate at full resolution, and it never goes below 0.
 */
export interface DecisionElementCounts {
  visit_count: number;
  last_visited_at?: string;
  reinforced_count: number;
  last_reinforced_at?: string;
}

export interface DecisionNodeCounts extends DecisionElementCounts {
  node_id: string;
}

export interface DecisionEdgeCounts extends DecisionElementCounts {
  source_node_id: string;
  target_node_id: string;
  condition: string;
}

/** Counts for every node and edge of one tree, persisted beside its Mermaid markdown. */
export interface DecisionTreeCounts {
  nodes: DecisionNodeCounts[];
  edges: DecisionEdgeCounts[];
}

/**
 * Points at one edge of a tree. `condition` only disambiguates: it is required when several
 * edges join the same pair of nodes, and ignored otherwise.
 */
export interface DecisionEdgeRef {
  source_node_id: string;
  target_node_id: string;
  condition?: string;
}

/** Nodes the agent collapsed into a single surviving node; their counts are summed into it. */
export interface DecisionNodeMerge {
  from: string[];
  into: string;
}

const TAKEN_PREFIX = '✅';

const ZERO_COUNTS: DecisionElementCounts = { visit_count: 0, reinforced_count: 0 };

/**
 * Edge identity: source, target and condition, but not whether it is taken, so an edge that only
 * became causal is the same edge rather than an add plus a remove. Shared with the version diff
 * so a carried count and a reported modification always agree on which edge is which.
 */
export const decisionEdgeKey = (edge: {
  source_node_id: string;
  target_node_id: string;
  condition: string;
}): string => `${edge.source_node_id}\u0000${edge.target_node_id}\u0000${edge.condition}`;

const pairKey = (sourceNodeId: string, targetNodeId: string): string =>
  `${sourceNodeId}\u0000${targetNodeId}`;

/** Mirrors the parser's condition cleanup so a ref copied from the file still matches. */
const normalizeCondition = (condition: string): string => {
  let normalized = condition
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  if (normalized.startsWith(TAKEN_PREFIX)) {
    normalized = normalized.slice(TAKEN_PREFIX.length).trim();
  }
  return (normalized || 'next').toLowerCase();
};

const latest = (first?: string, second?: string): string | undefined => {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  return Date.parse(second) > Date.parse(first) ? second : first;
};

const sumCounts = (
  first: DecisionElementCounts,
  second: DecisionElementCounts
): DecisionElementCounts => ({
  visit_count: first.visit_count + second.visit_count,
  last_visited_at: latest(first.last_visited_at, second.last_visited_at),
  reinforced_count: Math.max(0, first.reinforced_count + second.reinforced_count),
  last_reinforced_at: latest(first.last_reinforced_at, second.last_reinforced_at),
});

const pickCounts = ({
  visit_count: visitCount,
  last_visited_at: lastVisitedAt,
  reinforced_count: reinforcedCount,
  last_reinforced_at: lastReinforcedAt,
}: DecisionElementCounts): DecisionElementCounts => ({
  visit_count: visitCount,
  reinforced_count: reinforcedCount,
  ...(lastVisitedAt ? { last_visited_at: lastVisitedAt } : {}),
  ...(lastReinforcedAt ? { last_reinforced_at: lastReinforcedAt } : {}),
});

/** Lays counts out over exactly this tree's nodes and edges, in tree order. */
const assemble = (
  tree: DecisionTreeView,
  nodeCounts: Map<string, DecisionElementCounts>,
  edgeCounts: Map<string, DecisionElementCounts>
): DecisionTreeCounts => {
  const seenEdges = new Set<string>();
  return {
    nodes: tree.nodes.map(({ node_id: nodeId }) => ({
      node_id: nodeId,
      ...pickCounts(nodeCounts.get(nodeId) ?? ZERO_COUNTS),
    })),
    edges: tree.edges.flatMap((edge) => {
      const key = decisionEdgeKey(edge);
      // The parser keeps a repeated edge line; both copies are the same edge and share one count.
      if (seenEdges.has(key)) {
        return [];
      }
      seenEdges.add(key);
      return [
        {
          source_node_id: edge.source_node_id,
          target_node_id: edge.target_node_id,
          condition: edge.condition,
          ...pickCounts(edgeCounts.get(key) ?? ZERO_COUNTS),
        },
      ];
    }),
  };
};

const indexCounts = (
  counts: DecisionTreeCounts | undefined
): {
  nodeCounts: Map<string, DecisionElementCounts>;
  edgeCounts: Map<string, DecisionElementCounts>;
} => ({
  nodeCounts: new Map((counts?.nodes ?? []).map((entry) => [entry.node_id, pickCounts(entry)])),
  edgeCounts: new Map(
    (counts?.edges ?? []).map((entry) => [decisionEdgeKey(entry), pickCounts(entry)])
  ),
});

/**
 * Returns counts covering exactly `tree`: entries for elements no longer in the tree are dropped
 * and missing ones start at zero.
 */
export const countsForTree = (
  tree: DecisionTreeView,
  counts?: DecisionTreeCounts
): DecisionTreeCounts => {
  const { nodeCounts, edgeCounts } = indexCounts(counts);
  return assemble(tree, nodeCounts, edgeCounts);
};

/**
 * Resolves edge refs against the tree, deduplicated.
 *
 * Throws when a ref names an edge the tree does not have, or names a node pair joined by several
 * edges without a condition that picks one, so the caller can report it back to the agent.
 */
export const resolveEdgeRefs = (
  tree: DecisionTreeView,
  refs: DecisionEdgeRef[]
): DecisionEdgeView[] => {
  const edgesByPair = new Map<string, DecisionEdgeView[]>();
  for (const edge of tree.edges) {
    const key = pairKey(edge.source_node_id, edge.target_node_id);
    const candidates = edgesByPair.get(key) ?? [];
    if (!candidates.some((candidate) => candidate.condition === edge.condition)) {
      candidates.push(edge);
    }
    edgesByPair.set(key, candidates);
  }

  const resolved = new Map<string, DecisionEdgeView>();
  for (const ref of refs) {
    const label = `${ref.source_node_id} --> ${ref.target_node_id}`;
    const candidates = edgesByPair.get(pairKey(ref.source_node_id, ref.target_node_id)) ?? [];
    if (candidates.length === 0) {
      throw new DecisionTreeValidationError(
        tree.tree_id,
        `Decision tree ${tree.tree_id} has no edge ${label}`
      );
    }

    let edge: DecisionEdgeView | undefined;
    if (candidates.length === 1) {
      edge = candidates[0];
    } else if (ref.condition !== undefined) {
      const wanted = normalizeCondition(ref.condition);
      edge = candidates.find((candidate) => normalizeCondition(candidate.condition) === wanted);
    }
    if (!edge) {
      throw new DecisionTreeValidationError(
        tree.tree_id,
        `Edge ${label} in ${tree.tree_id} is ambiguous; set condition to one of: ${candidates
          .map((candidate) => `"${candidate.condition}"`)
          .join(', ')}`
      );
    }
    resolved.set(decisionEdgeKey(edge), edge);
  }
  return [...resolved.values()];
};

/** Endpoints of the given edges, each once. */
const pathNodeIds = (edges: DecisionEdgeView[]): Set<string> =>
  new Set(edges.flatMap((edge) => [edge.source_node_id, edge.target_node_id]));

const updatePath = ({
  tree,
  counts,
  path,
  update,
}: {
  tree: DecisionTreeView;
  counts: DecisionTreeCounts | undefined;
  path: DecisionEdgeRef[];
  update: (current: DecisionElementCounts) => DecisionElementCounts;
}): DecisionTreeCounts => {
  const edges = resolveEdgeRefs(tree, path);
  const { nodeCounts, edgeCounts } = indexCounts(counts);

  for (const edge of edges) {
    const key = decisionEdgeKey(edge);
    edgeCounts.set(key, update(edgeCounts.get(key) ?? ZERO_COUNTS));
  }
  for (const nodeId of pathNodeIds(edges)) {
    nodeCounts.set(nodeId, update(nodeCounts.get(nodeId) ?? ZERO_COUNTS));
  }
  return assemble(tree, nodeCounts, edgeCounts);
};

/**
 * Records one traversal of `path`: every edge on it and every node it touches gains a visit.
 * Reinforcement is left untouched.
 */
export const recordVisit = ({
  tree,
  counts,
  path,
  now,
}: {
  tree: DecisionTreeView;
  counts?: DecisionTreeCounts;
  path: DecisionEdgeRef[];
  now: string;
}): DecisionTreeCounts =>
  updatePath({
    tree,
    counts,
    path,
    update: (current) => ({
      ...current,
      visit_count: current.visit_count + 1,
      last_visited_at: now,
    }),
  });

const adjustReinforcement = ({
  tree,
  counts,
  path,
  delta,
  now,
}: {
  tree: DecisionTreeView;
  counts?: DecisionTreeCounts;
  path: DecisionEdgeRef[];
  delta: number;
  now: string;
}): DecisionTreeCounts =>
  updatePath({
    tree,
    counts,
    path,
    update: (current) => ({
      ...current,
      reinforced_count: Math.max(0, current.reinforced_count + delta),
      last_reinforced_at: now,
    }),
  });

const assertWeight = (tree: DecisionTreeView, weight: number): void => {
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new DecisionTreeValidationError(
      tree.tree_id,
      `Reinforcement weight must be a positive number, got ${weight}`
    );
  }
};

/** Adds `weight` (default 1) to `reinforced_count` along a verified causal path. Visits are untouched. */
export const reinforcePath = ({
  weight = 1,
  ...input
}: {
  tree: DecisionTreeView;
  counts?: DecisionTreeCounts;
  path: DecisionEdgeRef[];
  weight?: number;
  now: string;
}): DecisionTreeCounts => {
  assertWeight(input.tree, weight);
  return adjustReinforcement({ ...input, delta: weight });
};

/** Subtracts `weight` (default 1) from `reinforced_count` along a path, clamped at 0. */
export const penalizePath = ({
  weight = 1,
  ...input
}: {
  tree: DecisionTreeView;
  counts?: DecisionTreeCounts;
  path: DecisionEdgeRef[];
  weight?: number;
  now: string;
}): DecisionTreeCounts => {
  assertWeight(input.tree, weight);
  return adjustReinforcement({ ...input, delta: -weight });
};

/** Maps each merged-away node to the node that absorbed it, after checking the merges make sense. */
const buildMergeMap = (
  previousTree: DecisionTreeView,
  nextTree: DecisionTreeView,
  merges: DecisionNodeMerge[]
): Map<string, string> => {
  const previousIds = new Set(previousTree.nodes.map((node) => node.node_id));
  const nextIds = new Set(nextTree.nodes.map((node) => node.node_id));
  const mergeMap = new Map<string, string>();
  const fail = (message: string): never => {
    throw new DecisionTreeValidationError(nextTree.tree_id, message);
  };

  for (const { from, into } of merges) {
    if (!nextIds.has(into)) {
      fail(`Merge target ${into} is not a node of the edited tree ${nextTree.tree_id}`);
    }
    for (const nodeId of from) {
      if (nodeId === into) {
        continue;
      }
      if (!previousIds.has(nodeId)) {
        fail(`Merged node ${nodeId} is not a node of the previous tree ${nextTree.tree_id}`);
      }
      // A merged node that survives would keep its own counts and add them to the target too.
      if (nextIds.has(nodeId)) {
        fail(`Merged node ${nodeId} still exists in the edited tree ${nextTree.tree_id}`);
      }
      const existing = mergeMap.get(nodeId);
      if (existing !== undefined && existing !== into) {
        fail(`Node ${nodeId} is merged into both ${existing} and ${into}`);
      }
      mergeMap.set(nodeId, into);
    }
  }
  return mergeMap;
};

/**
 * Carries counts from the previous version of a tree onto the edited one.
 *
 * Nodes keep their counts by id; a node listed in `merges` adds its counts to the node that
 * absorbed it. Edges keep their counts by source, target and condition after their endpoints are
 * mapped through the merges, and edges that collapse onto one sum. When an edge's condition was
 * only reworded, it still carries its counts as long as it is the only edge between its two nodes
 * in both versions. Counts for anything removed from the tree are dropped.
 */
export const carryCounts = ({
  previousTree,
  previousCounts,
  nextTree,
  merges = [],
}: {
  previousTree: DecisionTreeView;
  previousCounts?: DecisionTreeCounts;
  nextTree: DecisionTreeView;
  merges?: DecisionNodeMerge[];
}): DecisionTreeCounts => {
  const mergeMap = buildMergeMap(previousTree, nextTree, merges);
  const resolveNode = (nodeId: string): string => mergeMap.get(nodeId) ?? nodeId;
  const previous = countsForTree(previousTree, previousCounts);

  const nodeCounts = new Map<string, DecisionElementCounts>();
  for (const entry of previous.nodes) {
    const nodeId = resolveNode(entry.node_id);
    nodeCounts.set(nodeId, sumCounts(nodeCounts.get(nodeId) ?? ZERO_COUNTS, pickCounts(entry)));
  }

  const nextEdgeKeys = new Set(nextTree.edges.map(decisionEdgeKey));
  const nextConditionsByPair = new Map<string, Set<string>>();
  for (const edge of nextTree.edges) {
    const key = pairKey(edge.source_node_id, edge.target_node_id);
    const conditions = nextConditionsByPair.get(key) ?? new Set<string>();
    conditions.add(edge.condition);
    nextConditionsByPair.set(key, conditions);
  }

  const remappedEdges = previous.edges.map((entry) => ({
    ...entry,
    source_node_id: resolveNode(entry.source_node_id),
    target_node_id: resolveNode(entry.target_node_id),
  }));
  const remappedConditionsByPair = new Map<string, Set<string>>();
  for (const edge of remappedEdges) {
    const key = pairKey(edge.source_node_id, edge.target_node_id);
    const conditions = remappedConditionsByPair.get(key) ?? new Set<string>();
    conditions.add(edge.condition);
    remappedConditionsByPair.set(key, conditions);
  }

  const edgeCounts = new Map<string, DecisionElementCounts>();
  for (const edge of remappedEdges) {
    let key = decisionEdgeKey(edge);
    if (!nextEdgeKeys.has(key)) {
      const pair = pairKey(edge.source_node_id, edge.target_node_id);
      const nextConditions = nextConditionsByPair.get(pair);
      if (nextConditions?.size !== 1 || remappedConditionsByPair.get(pair)?.size !== 1) {
        continue;
      }
      const [condition] = nextConditions;
      key = decisionEdgeKey({ ...edge, condition });
    }
    edgeCounts.set(key, sumCounts(edgeCounts.get(key) ?? ZERO_COUNTS, pickCounts(edge)));
  }

  return assemble(nextTree, nodeCounts, edgeCounts);
};
