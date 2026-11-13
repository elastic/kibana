/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DECISION_NODE_TYPES,
  DecisionTreeValidationError,
  decisionEdgeKey,
  resolveEdgeRefs,
} from '@kbn/nightshift-decision-trees';
import type { DecisionEdgeView, DecisionTreeView } from '@kbn/nightshift-decision-trees';
import {
  declaresMerge,
  isSeededTree,
  parseTreeMarkdown,
  submissionsForTree,
  walkEdges,
} from './arguments';
import type { PathStep, ReinforcementTaskOutput, SubmitArguments } from './types';

export interface CheckResult {
  score: 0 | 1;
  explanation: string;
}

export interface CheckContext {
  output: ReinforcementTaskOutput;
  /** The round's seeded tree, or undefined when the round created a new one. */
  seededTreeId: string | undefined;
  /** Whether the round confirmed a root cause. */
  causalConfirmed: boolean;
}

type GradedTree = NonNullable<ReinforcementTaskOutput['trees']>[number];

/** One graded tree with its parsed versions and the submits that address it. */
interface TreeState {
  treeId: string;
  priorMermaid: string | undefined;
  prior: DecisionTreeView | undefined;
  submitted: DecisionTreeView | undefined;
  submissions: SubmitArguments[];
  /** Non-empty causal paths on the last submit that names this tree. */
  causalPaths: PathStep[][];
  /** The round created this tree or changed its content. */
  edited: boolean;
}

const pass = (explanation: string): CheckResult => ({ score: 1, explanation });

const fail = (...problems: string[]): CheckResult => ({
  score: 0,
  explanation: problems.join('\n'),
});

const result = (problems: string[], passed: string): CheckResult =>
  problems.length > 0 ? fail(...problems) : pass(passed);

/** Trees the task graded, seeded tree first; falls back to the single tree on older outputs. */
export const gradedTrees = (output: ReinforcementTaskOutput): GradedTree[] => {
  if (output.trees?.length) return output.trees;
  if (!output.tree_id) return [];
  return [
    {
      tree_id: output.tree_id,
      prior_mermaid: output.prior_mermaid,
      submitted_mermaid: output.submitted_mermaid,
    },
  ];
};

const treeState = (output: ReinforcementTaskOutput, tree: GradedTree): TreeState => {
  const submissions = submissionsForTree(output.submissions, tree.tree_id);
  return {
    treeId: tree.tree_id,
    priorMermaid: tree.prior_mermaid || undefined,
    prior: parseTreeMarkdown(tree.prior_mermaid, tree.tree_id),
    submitted: parseTreeMarkdown(tree.submitted_mermaid, tree.tree_id),
    submissions,
    causalPaths: (submissions.at(-1)?.traversals ?? [])
      .map((traversal) => traversal.causal_path ?? [])
      .filter((path) => path.length > 0),
    edited: !tree.prior_mermaid || tree.submitted_mermaid !== tree.prior_mermaid,
  };
};

const formatEdge = ({
  source_node_id: source,
  target_node_id: target,
  condition,
}: DecisionEdgeView) =>
  condition ? `${source} -->|${condition}| ${target}` : `${source} --> ${target}`;

const formatEdges = (edges: DecisionEdgeView[]): string => edges.map(formatEdge).join(', ');

const NODE_PAIR_SEPARATOR = '\u0000';

/** The ordered node pair an edge joins, whatever its condition. */
const nodePair = (source: string, target: string): string =>
  [source, target].join(NODE_PAIR_SEPARATOR);

/** Each node a submit for this tree folded away, mapped to the node that absorbed it. */
const mergeTargets = (submissions: SubmitArguments[]): Map<string, string> => {
  const targets = new Map<string, string>();
  for (const submission of submissions) {
    for (const tree of submission.symptom_trees ?? []) {
      for (const { from, into } of tree.merged_nodes ?? []) {
        if (!into) continue;
        for (const id of from ?? []) targets.set(id, into);
      }
    }
  }
  return targets;
};

/**
 * ✅ edges in the submitted tree that the prior tree did not already mark. A prior ✅ follows its
 * nodes through the declared merges and ignores the condition, so a legacy mark stays legacy after
 * a merge or a relabel.
 */
const newCheckmarks = ({ prior, submitted, submissions }: TreeState): DecisionEdgeView[] => {
  const merges = mergeTargets(submissions);
  const remap = (nodeId: string): string => merges.get(nodeId) ?? nodeId;
  const priorTaken = new Set(
    (prior?.edges ?? [])
      .filter((edge) => edge.is_taken)
      .map(({ source_node_id: source, target_node_id: target }) =>
        nodePair(remap(source), remap(target))
      )
  );
  return (submitted?.edges ?? []).filter(
    (edge) => edge.is_taken && !priorTaken.has(nodePair(edge.source_node_id, edge.target_node_id))
  );
};

interface ResolvedPath {
  edges: DecisionEdgeView[];
  firstNodeId?: string;
  lastNodeId?: string;
  problems: string[];
}

const resolvePath = (tree: DecisionTreeView, steps: PathStep[]): ResolvedPath => {
  const { refs, problems } = walkEdges(steps, 'causal_path', tree.tree_id);
  if (problems.length > 0) return { edges: [], problems };
  try {
    return {
      edges: resolveEdgeRefs(tree, refs),
      firstNodeId: refs[0]?.source_node_id,
      lastNodeId: refs.at(-1)?.target_node_id,
      problems: [],
    };
  } catch (error) {
    const message = error instanceof DecisionTreeValidationError ? error.message : String(error);
    return { edges: [], problems: [`causal_path does not match the submitted tree: ${message}`] };
  }
};

/** Edge keys of every causal path the last submit gave for the tree that resolve on it. */
const causalEdgeKeys = ({ submitted, causalPaths }: TreeState): Set<string> => {
  if (!submitted) return new Set();
  return new Set(
    causalPaths.flatMap((path) => resolvePath(submitted, path).edges).map(decisionEdgeKey)
  );
};

const offPathCheckmarks = (state: TreeState): DecisionEdgeView[] => {
  const causal = causalEdgeKeys(state);
  return newCheckmarks(state).filter((edge) => !causal.has(decisionEdgeKey(edge)));
};

const unparsed = (treeId: string): string => `${treeId}: the submitted tree could not be parsed.`;

const NO_TREE_CREATED = 'No tree was seeded, and the round created no tree.';

/**
 * Every graded tree parses and adds ✅ only on its causal path, and every tree the round created or
 * edited has a node of each type. A ✅ the prior tree already carried is a legacy visit mark and is
 * left alone.
 */
export const checkNoVisitedCheckmarks = ({ output, seededTreeId }: CheckContext): CheckResult => {
  const states = gradedTrees(output).map((tree) => treeState(output, tree));
  if (states.length === 0) {
    return seededTreeId ? pass('The round graded no tree.') : fail(NO_TREE_CREATED);
  }
  const problems = states.flatMap((state) => {
    const { treeId, submitted, edited } = state;
    if (!submitted) return [unparsed(treeId)];
    const missing = edited
      ? DECISION_NODE_TYPES.filter(
          (type) => !submitted.nodes.some((node) => node.node_type === type)
        )
      : [];
    const offPath = offPathCheckmarks(state);
    return [
      ...(missing.length > 0 ? [`${treeId} has no ${missing.join(', ')} node.`] : []),
      ...(offPath.length > 0
        ? [`${treeId}: ✅ added off the causal path: ${formatEdges(offPath)}`]
        : []),
    ];
  });
  return result(
    problems,
    `Every graded tree parses and adds ✅ only on its causal path (${states
      .map(({ treeId }) => treeId)
      .join(', ')}).`
  );
};

/** A confirmed round marks one walk from a symptom to an end node, and only that walk. */
const confirmedPathProblems = (state: TreeState): string[] => {
  const { treeId, submitted, causalPaths } = state;
  if (!submitted) return [unparsed(treeId)];
  if (causalPaths.length === 0) {
    return [`${treeId}: the round confirmed a cause, but causal_path is empty.`];
  }
  const nodeType = (nodeId: string | undefined) =>
    submitted.nodes.find((node) => node.node_id === nodeId)?.node_type;
  const problems = causalPaths.flatMap((steps) => {
    const {
      edges,
      firstNodeId,
      lastNodeId,
      problems: pathProblems,
    } = resolvePath(submitted, steps);
    if (pathProblems.length > 0) return pathProblems.map((problem) => `${treeId}: ${problem}`);
    const unmarked = edges.filter((edge) => !edge.is_taken);
    return [
      ...(nodeType(firstNodeId) !== 'symptom'
        ? [`${treeId}: causal_path starts at ${firstNodeId}, not at a symptom node.`]
        : []),
      ...(nodeType(lastNodeId) !== 'end'
        ? [`${treeId}: causal_path ends at ${lastNodeId}, not at an end node.`]
        : []),
      ...(unmarked.length > 0
        ? [`${treeId}: causal_path edges without ✅: ${formatEdges(unmarked)}`]
        : []),
    ];
  });
  const offPath = offPathCheckmarks(state);
  if (offPath.length > 0) {
    problems.push(`${treeId}: ✅ added off the causal path: ${formatEdges(offPath)}`);
  }
  return problems;
};

/** An unconfirmed round gives no causal path and adds no ✅. */
const unconfirmedPathProblems = (state: TreeState): string[] => {
  const { treeId, submitted, causalPaths } = state;
  if (!submitted) return [unparsed(treeId)];
  const added = newCheckmarks(state);
  return [
    ...(causalPaths.length > 0
      ? [`${treeId}: the round confirmed no cause, but causal_path is set.`]
      : []),
    ...(added.length > 0
      ? [`${treeId}: the round confirmed no cause, but ✅ was added: ${formatEdges(added)}`]
      : []),
  ];
};

/**
 * On the seeded tree (or, with no seed, on the trees the run wrote): a confirmed round marks exactly
 * its causal path from a symptom to an end node; an unconfirmed round marks nothing.
 */
export const checkCausalPathMarked = ({
  output,
  seededTreeId,
  causalConfirmed,
}: CheckContext): CheckResult => {
  const trees = gradedTrees(output);
  const problemsFor = causalConfirmed ? confirmedPathProblems : unconfirmedPathProblems;
  const passed = causalConfirmed
    ? 'The causal path runs from a symptom to an end node and is exactly the edges marked ✅.'
    : 'The round confirmed no cause; no causal path and no new ✅.';

  if (seededTreeId) {
    const seeded = trees.find((tree) => isSeededTree(seededTreeId, tree.tree_id));
    if (!seeded) return fail(`The seeded tree ${seededTreeId} was not graded.`);
    return result(problemsFor(treeState(output, seeded)), passed);
  }

  if (trees.length === 0) return fail(NO_TREE_CREATED);
  const perTree = trees.map((tree) => problemsFor(treeState(output, tree)));
  // With no seed, one tree carrying the confirmed path is enough.
  if (causalConfirmed && perTree.some((problems) => problems.length === 0)) return pass(passed);
  return result(perTree.flat(), passed);
};

/** Node ids a submit for this tree walked, and the nodes its merges removed or absorbed into. */
const walkedAndMerged = (submissions: SubmitArguments[]) => {
  const walked = new Set<string>();
  const merged = new Set<string>();
  for (const submission of submissions) {
    for (const { visited_path: visited, causal_path: causal } of submission.traversals ?? []) {
      for (const step of [...(visited ?? []), ...(causal ?? [])]) {
        const id = typeof step === 'string' ? step : step?.id;
        if (id) walked.add(id);
      }
    }
    for (const tree of submission.symptom_trees ?? []) {
      for (const { from, into } of tree.merged_nodes ?? []) {
        for (const id of [...(from ?? []), ...(into ? [into] : [])]) merged.add(id);
      }
    }
  }
  return { walked, merged };
};

/**
 * The seeded tree keeps every node and edge the round did not walk or merge: same id, type and
 * label for nodes, and the same source, target and condition for edges (✅ ignored).
 */
const branchKey = ({ source_node_id: source, condition }: DecisionEdgeView): string =>
  `${source}\u0000${condition.trim().toLowerCase()}`;

export const checkStructurePreserved = ({ output, seededTreeId }: CheckContext): CheckResult => {
  if (!seededTreeId) return pass('No prior tree: the round created a new tree.');
  const seeded = gradedTrees(output).find((tree) => isSeededTree(seededTreeId, tree.tree_id));
  if (!seeded) return fail(`The seeded tree ${seededTreeId} was not graded.`);
  const { treeId, prior, priorMermaid, submitted, submissions } = treeState(output, seeded);
  if (!prior) {
    return fail(
      `${treeId}: the prior tree ${priorMermaid ? 'could not be parsed' : 'is missing'}.`
    );
  }
  if (!submitted) return fail(unparsed(treeId));

  const { walked, merged } = walkedAndMerged(submissions);
  const after = new Map(submitted.nodes.map((node) => [node.node_id, node]));
  const afterEdges = new Set(submitted.edges.map(decisionEdgeKey));
  // Branches the walk took out of a walked node. Reinforcing may insert verified steps on such a
  // branch, so its old edge can move below the new nodes.
  const walkedBranches = new Set(
    submitted.edges
      .filter(
        ({ source_node_id: source, target_node_id: target }) =>
          walked.has(source) && walked.has(target)
      )
      .map(branchKey)
  );
  const problems: string[] = [];

  for (const node of prior.nodes) {
    if (walked.has(node.node_id) || merged.has(node.node_id)) continue;
    const kept = after.get(node.node_id);
    if (!kept) {
      problems.push(`${treeId}: node ${node.node_id} "${node.label}" was removed.`);
    } else if (kept.node_type !== node.node_type || kept.label !== node.label) {
      problems.push(
        `${treeId}: node ${node.node_id} changed from ${node.node_type} "${node.label}" to ${kept.node_type} "${kept.label}".`
      );
    }
  }
  for (const edge of prior.edges) {
    const { source_node_id: source, target_node_id: target } = edge;
    if (walked.has(source) && walked.has(target)) continue;
    if (walked.has(source) && walkedBranches.has(branchKey(edge))) continue;
    if (merged.has(source) || merged.has(target)) continue;
    if (!afterEdges.has(decisionEdgeKey(edge))) {
      problems.push(`${treeId}: edge ${formatEdge(edge)} was removed.`);
    }
  }
  return result(problems, `${treeId} keeps every node and edge the round did not walk or merge.`);
};

/** The last submit naming the seeded tree folds at least one of its nodes into another. */
export const checkMergesDeclared = ({ output, seededTreeId }: CheckContext): CheckResult => {
  if (!seededTreeId) return fail('The round requires a merge, but it seeded no tree to merge.');
  const last = submissionsForTree(output.submissions, seededTreeId).at(-1);
  if (!last) return fail(`No submit named ${seededTreeId}, so it declared no merge.`);
  return declaresMerge(last, seededTreeId)
    ? pass(`The last submit for ${seededTreeId} declares a merge.`)
    : fail(
        `The round folds duplicate nodes in ${seededTreeId}, but the last submit for it declares no merged_nodes entry with from and into set.`
      );
};

/**
 * A confirmed round on a seeded tree is applied as a `reinforce` write on that tree; any other round
 * reinforces nothing (a new tree is a `create`).
 */
export const checkReinforcementDetected = ({
  output,
  seededTreeId,
  causalConfirmed,
}: CheckContext): CheckResult => {
  const treeWrites = (output.applied_writes ?? []).filter(
    ({ store, item_id: itemId }) =>
      store === 'decision_tree' && (!seededTreeId || isSeededTree(seededTreeId, itemId))
  );
  const listed =
    treeWrites.map(({ item_id: itemId, action }) => `${itemId}: ${action}`).join(', ') || 'none';
  const reinforced = treeWrites.some(({ action }) => action === 'reinforce');

  if (causalConfirmed && seededTreeId) {
    return reinforced
      ? pass(`${seededTreeId} was reinforced. Writes: ${listed}.`)
      : fail(
          `The round confirmed a cause on ${seededTreeId}, but no write reinforced it. Writes: ${listed}.`
        );
  }
  // Without a seed, a confirmed live round may create a tree or reinforce one already stored.
  if (causalConfirmed) {
    return pass(`The round seeded no tree, so either outcome is right. Writes: ${listed}.`);
  }
  const why = 'the round confirmed no cause';
  return reinforced
    ? fail(`A write reinforced a tree, but ${why}. Writes: ${listed}.`)
    : pass(`No write reinforced a tree, as expected: ${why}. Writes: ${listed}.`);
};
