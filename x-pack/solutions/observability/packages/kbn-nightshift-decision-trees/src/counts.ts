/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decisionEdgeKey, nodePairKey } from './edge_key';
import { DecisionTreeValidationError } from './guardrails';
import { parseEdgeCondition } from './mermaid';
import type { DecisionEdgeView, DecisionTreeView } from './types';

/** Visit and reinforcement counters for one node or edge; `reinforced_count` is a float, never below 0. */
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

/** Points at one edge; `condition` is only needed when several edges join the same two nodes. */
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

/** A visit or reinforcement update along one path of a tree. */
export interface DecisionPathUpdate {
  tree: DecisionTreeView;
  counts?: DecisionTreeCounts;
  path: DecisionEdgeRef[];
  /** ISO timestamp recorded as the last visit or reinforcement. */
  now: string;
}

/** A reinforce or penalize update; `weight` must be positive and defaults to 1. */
export interface DecisionWeightedPathUpdate extends DecisionPathUpdate {
  weight?: number;
}

type CountsByKey = Map<string, DecisionElementCounts>;

const ZERO_COUNTS: DecisionElementCounts = { visit_count: 0, reinforced_count: 0 };

const groupByNodePair = <Edge extends { source_node_id: string; target_node_id: string }>(
  edges: Edge[]
): Map<string, Edge[]> => {
  const groups = new Map<string, Edge[]>();
  for (const edge of edges) {
    const key = nodePairKey(edge);
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  return groups;
};

/** Agents echo conditions back with ✅, quotes or different case; none of that changes the edge. */
const conditionMatchKey = (condition: string): string =>
  parseEdgeCondition(condition).condition.toLowerCase();

const latest = (first?: string, second?: string): string | undefined => {
  if (!first || !second) {
    return first ?? second;
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

/** Keeps only the counter fields, dropping identity fields and unset timestamps. */
const counterFields = ({
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

const indexCounts = (
  counts: DecisionTreeCounts | undefined
): { nodeCounts: CountsByKey; edgeCounts: CountsByKey } => ({
  nodeCounts: new Map((counts?.nodes ?? []).map((entry) => [entry.node_id, counterFields(entry)])),
  edgeCounts: new Map(
    (counts?.edges ?? []).map((entry) => [decisionEdgeKey(entry), counterFields(entry)])
  ),
});

/** Emits one entry per node and edge of `tree`, in tree order, zero where nothing is counted. */
const toTreeCounts = (
  tree: DecisionTreeView,
  nodeCounts: CountsByKey,
  edgeCounts: CountsByKey
): DecisionTreeCounts => {
  const seenEdges = new Set<string>();
  return {
    nodes: tree.nodes.map(({ node_id: nodeId }) => ({
      node_id: nodeId,
      ...counterFields(nodeCounts.get(nodeId) ?? ZERO_COUNTS),
    })),
    edges: tree.edges.flatMap((edge) => {
      const { source_node_id: sourceNodeId, target_node_id: targetNodeId, condition } = edge;
      const key = decisionEdgeKey(edge);
      // The parser keeps a repeated edge line; both copies are the same edge and share one count.
      if (seenEdges.has(key)) {
        return [];
      }
      seenEdges.add(key);
      return [
        {
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          condition,
          ...counterFields(edgeCounts.get(key) ?? ZERO_COUNTS),
        },
      ];
    }),
  };
};

/** Returns counts covering exactly `tree`, dropping stale entries and zero-filling new elements. */
export const countsForTree = (
  tree: DecisionTreeView,
  counts?: DecisionTreeCounts
): DecisionTreeCounts => {
  const { nodeCounts, edgeCounts } = indexCounts(counts);
  return toTreeCounts(tree, nodeCounts, edgeCounts);
};

/** The only candidate, the exact condition match, or a unique case-insensitive match; else `undefined`. */
const pickCandidate = (
  candidates: DecisionEdgeView[],
  condition: string | undefined
): DecisionEdgeView | undefined => {
  if (candidates.length === 1) {
    return candidates[0];
  }
  if (condition === undefined) {
    return undefined;
  }
  const { condition: cleaned } = parseEdgeCondition(condition);
  const exact = candidates.find((candidate) => candidate.condition === cleaned);
  if (exact) {
    return exact;
  }
  const loose = candidates.filter(
    (candidate) => conditionMatchKey(candidate.condition) === conditionMatchKey(cleaned)
  );
  return loose.length === 1 ? loose[0] : undefined;
};

/** Resolves edge refs against the tree, throwing a validation error for unknown or ambiguous refs. */
export const resolveEdgeRefs = (
  tree: DecisionTreeView,
  refs: DecisionEdgeRef[]
): DecisionEdgeView[] => {
  const { tree_id: treeId } = tree;
  const edgesByPair = groupByNodePair(tree.edges);
  const resolved = new Map<string, DecisionEdgeView>();

  for (const ref of refs) {
    const { source_node_id: sourceNodeId, target_node_id: targetNodeId, condition } = ref;
    const label = `${sourceNodeId} --> ${targetNodeId}`;
    // Repeated edge lines are one edge, not a choice the agent has to make.
    const candidates = [
      ...new Map(
        (edgesByPair.get(nodePairKey(ref)) ?? []).map((edge) => [edge.condition, edge])
      ).values(),
    ];
    if (candidates.length === 0) {
      throw new DecisionTreeValidationError(treeId, `Decision tree ${treeId} has no edge ${label}`);
    }

    const edge = pickCandidate(candidates, condition);
    if (!edge) {
      throw new DecisionTreeValidationError(
        treeId,
        `Edge ${label} in ${treeId} is ambiguous; set condition to one of: ${candidates
          .map((candidate) => `"${candidate.condition}"`)
          .join(', ')}`
      );
    }
    resolved.set(decisionEdgeKey(edge), edge);
  }
  return [...resolved.values()];
};

const updatePath = (
  { tree, counts, path }: DecisionPathUpdate,
  update: (current: DecisionElementCounts) => DecisionElementCounts
): DecisionTreeCounts => {
  const edges = resolveEdgeRefs(tree, path);
  const { nodeCounts, edgeCounts } = indexCounts(counts);

  for (const edge of edges) {
    const key = decisionEdgeKey(edge);
    edgeCounts.set(key, update(edgeCounts.get(key) ?? ZERO_COUNTS));
  }
  // A node on the path counts once, however many of the path's edges touch it.
  const nodeIds = new Set(edges.flatMap((edge) => [edge.source_node_id, edge.target_node_id]));
  for (const nodeId of nodeIds) {
    nodeCounts.set(nodeId, update(nodeCounts.get(nodeId) ?? ZERO_COUNTS));
  }
  return toTreeCounts(tree, nodeCounts, edgeCounts);
};

/** Adds one visit to every edge on `path` and every node it touches, leaving reinforcement untouched. */
export const recordVisit = (input: DecisionPathUpdate): DecisionTreeCounts =>
  updatePath(input, (current) => ({
    ...current,
    visit_count: current.visit_count + 1,
    last_visited_at: input.now,
  }));

/** Validates the weight up front, so a bad one is rejected even on an empty path. */
const reinforcementUpdate = (
  { tree, now, weight = 1 }: DecisionWeightedPathUpdate,
  direction: 1 | -1
): ((current: DecisionElementCounts) => DecisionElementCounts) => {
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new DecisionTreeValidationError(
      tree.tree_id,
      `Reinforcement weight must be a positive number, got ${weight}`
    );
  }
  return (current) => ({
    ...current,
    reinforced_count: Math.max(0, current.reinforced_count + direction * weight),
    last_reinforced_at: now,
  });
};

/** Adds `weight` to `reinforced_count` along a verified causal path, leaving visits untouched. */
export const reinforcePath = (input: DecisionWeightedPathUpdate): DecisionTreeCounts =>
  updatePath(input, reinforcementUpdate(input, 1));

/** Subtracts `weight` from `reinforced_count` along a path, clamped at 0. */
export const penalizePath = (input: DecisionWeightedPathUpdate): DecisionTreeCounts =>
  updatePath(input, reinforcementUpdate(input, -1));

/** Maps each merged-away node to the node that absorbed it, rejecting merges that would miscount. */
const buildMergeMap = (
  previousTree: DecisionTreeView,
  nextTree: DecisionTreeView,
  merges: DecisionNodeMerge[]
): Map<string, string> => {
  const { tree_id: treeId } = nextTree;
  const previousIds = new Set(previousTree.nodes.map((node) => node.node_id));
  const nextIds = new Set(nextTree.nodes.map((node) => node.node_id));
  const mergeMap = new Map<string, string>();
  const reject = (message: string): never => {
    throw new DecisionTreeValidationError(treeId, message);
  };

  for (const { from, into } of merges) {
    if (!nextIds.has(into)) {
      reject(`Merge target ${into} is not a node of the edited tree ${treeId}`);
    }
    for (const nodeId of from.filter((id) => id !== into)) {
      if (!previousIds.has(nodeId)) {
        reject(`Merged node ${nodeId} is not a node of the previous tree ${treeId}`);
      }
      // A merged node that survives would keep its own counts and add them to the target too.
      if (nextIds.has(nodeId)) {
        reject(`Merged node ${nodeId} still exists in the edited tree ${treeId}`);
      }
      const existing = mergeMap.get(nodeId);
      if (existing !== undefined && existing !== into) {
        reject(`Node ${nodeId} is merged into both ${existing} and ${into}`);
      }
      mergeMap.set(nodeId, into);
    }
  }
  return mergeMap;
};

/** Carries counts from the previous version of a tree onto the edited one, summing merged nodes and edges. */
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

  const nodeCounts: CountsByKey = new Map();
  for (const entry of previous.nodes) {
    const nodeId = resolveNode(entry.node_id);
    nodeCounts.set(nodeId, sumCounts(nodeCounts.get(nodeId) ?? ZERO_COUNTS, counterFields(entry)));
  }

  const remappedEdges = previous.edges.map((entry) => ({
    ...entry,
    source_node_id: resolveNode(entry.source_node_id),
    target_node_id: resolveNode(entry.target_node_id),
    remapped: mergeMap.has(entry.source_node_id) || mergeMap.has(entry.target_node_id),
  }));
  // Before remapping: an edge that only exists because a merge moved it onto this pair is new.
  const previousKeys = new Set(previous.edges.map(decisionEdgeKey));
  const nextKeys = new Set(nextTree.edges.map(decisionEdgeKey));
  const nextEdgesByPair = groupByNodePair(nextTree.edges);

  // An edge with no exact match folds onto the only edge left between its two nodes when that is a
  // declared merge or the surviving edge is new (reworded or collapsed); next to an edge that was
  // already there, it was simply deleted.
  const targetKey = (edge: (typeof remappedEdges)[number]): string | undefined => {
    const key = decisionEdgeKey(edge);
    if (nextKeys.has(key)) {
      return key;
    }
    const survivors = [
      ...new Set((nextEdgesByPair.get(nodePairKey(edge)) ?? []).map(decisionEdgeKey)),
    ];
    if (survivors.length !== 1) {
      return undefined;
    }
    const [survivor] = survivors;
    return edge.remapped || !previousKeys.has(survivor) ? survivor : undefined;
  };

  const edgeCounts: CountsByKey = new Map();
  for (const edge of remappedEdges) {
    const key = targetKey(edge);
    if (key !== undefined) {
      edgeCounts.set(key, sumCounts(edgeCounts.get(key) ?? ZERO_COUNTS, counterFields(edge)));
    }
  }

  return toTreeCounts(nextTree, nodeCounts, edgeCounts);
};
