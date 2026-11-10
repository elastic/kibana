/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DecisionTreeValidationError,
  extractMermaid,
  parseMermaidDecisionTree,
  resolveEdgeRefs,
  symptomSlugFromTreeId,
} from '@kbn/nightshift-decision-trees';
import type { DecisionEdgeRef, DecisionTreeView } from '@kbn/nightshift-decision-trees';
import type { PathStep, SubmitArguments, TraversalSubmission } from './types';

const SUBMIT_TOOL = 'nightshift_submit_optimizer_result';

/**
 * A hypothesis the investigator marked `confirmed`, in a JSON or YAML-like status field. A confirmed
 * hypothesis is what makes a path causal.
 */
const CONFIRMED_CAUSE_RE = /"status"\s*:\s*"confirmed"|\bstatus:\s*['"]?confirmed\b/i;

/** True when the investigator response confirms a cause, so the submit must carry a causal path. */
export const confirmsCause = (response: string): boolean => CONFIRMED_CAUSE_RE.test(response);

/** The submit tool accepts a bare slug for the `symptom:<slug>` tree, so compare by slug. */
const namesTree = (named: string | undefined, treeId: string): boolean =>
  !named || symptomSlugFromTreeId(named) === symptomSlugFromTreeId(treeId);

/** True when `treeId` is the round's seeded tree. A live run seeds none. */
export const isSeededTree = (seededId: string | undefined, treeId: string): boolean =>
  Boolean(seededId) && namesTree(seededId, treeId);

/**
 * A submit naming no tree applies to every tree. One that names only other trees, like a retry of
 * a tree rejected earlier, says nothing about `treeId`.
 */
const addressesTree = (submission: SubmitArguments, treeId: string): boolean => {
  const entries = [...(submission.symptom_trees ?? []), ...(submission.traversals ?? [])];
  return entries.length === 0 || entries.some((entry) => namesTree(entry.tree_id, treeId));
};

/**
 * Keeps the submits that address `treeId`, narrowed to its merges and traversals, so the last
 * submit graded for a tree is the last one that named it.
 */
export const submissionsForTree = (
  submissions: SubmitArguments[],
  treeId: string
): SubmitArguments[] =>
  submissions
    .filter((submission) => addressesTree(submission, treeId))
    .map((submission) => ({
      ...submission,
      symptom_trees: (submission.symptom_trees ?? []).filter((tree) =>
        namesTree(tree.tree_id, treeId)
      ),
      traversals: (submission.traversals ?? []).filter((traversal) =>
        namesTree(traversal.tree_id, treeId)
      ),
    }));

/** Tree ids named on one submit call, in first-seen order. */
export const treeIdsInSubmission = (submission: SubmitArguments | undefined): string[] => {
  const ids = [
    ...(submission?.traversals ?? []).map((traversal) => traversal.tree_id),
    ...(submission?.symptom_trees ?? []).map((tree) => tree.tree_id),
  ].filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
};

/** Parses the reinforce step's `submissions_json`. A bad payload is no submissions. */
export const parseSubmissions = (json: string | undefined): SubmitArguments[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as SubmitArguments[]) : [];
  } catch {
    return [];
  }
};

/** The tree as stored, or undefined when the markdown has no Mermaid diagram. */
export const parseTreeMarkdown = (
  markdown: string | undefined,
  treeId: string
): DecisionTreeView | undefined => {
  if (!markdown) return undefined;
  try {
    return parseMermaidDecisionTree(extractMermaid(markdown), treeId);
  } catch {
    return undefined;
  }
};

const stepId = (step: PathStep): string | undefined => {
  if (typeof step === 'string' && step.length > 0) return step;
  if (step && typeof step === 'object' && step.id) return step.id;
  return undefined;
};

/**
 * A path is node ids in order. Consecutive ids are one edge. A step with no id, or a single id,
 * does not name an edge.
 */
const walkEdges = (
  steps: PathStep[] | undefined,
  label: string,
  treeId: string
): { refs: DecisionEdgeRef[]; problems: string[] } => {
  if (!steps || steps.length === 0) return { refs: [], problems: [] };
  const problems: string[] = [];
  const ids: Array<string | undefined> = steps.map((step, index) => {
    const id = stepId(step);
    if (!id) problems.push(`${label} for ${treeId} step ${index + 1} is missing a node id.`);
    return id;
  });
  if (problems.length > 0) return { refs: [], problems };
  if (ids.length === 1) {
    return {
      refs: [],
      problems: [`${label} for ${treeId} names no edge. List at least two node ids.`],
    };
  }
  const refs: DecisionEdgeRef[] = [];
  for (let index = 1; index < ids.length; index++) {
    const source = ids[index - 1];
    const target = ids[index];
    if (!source || !target) continue;
    const step = steps[index];
    const condition = typeof step === 'string' ? undefined : step.condition;
    refs.push({
      source_node_id: source,
      target_node_id: target,
      ...(condition ? { condition } : {}),
    });
  }
  return { refs, problems };
};

const formatArguments = (submission: SubmitArguments): string =>
  JSON.stringify(
    {
      summary: submission.summary ?? '',
      symptom_trees: submission.symptom_trees ?? [],
      traversals: submission.traversals ?? [],
    },
    null,
    2
  );

/**
 * Structural check of what a turn's submit calls left on the tree (see `effectiveSubmission`)
 * against the investigation response, the tree before the run, and the tree after it. A score of 1
 * means the agent passed a traversal for this tree, the visit path is non-empty, the causal path is
 * set only when the response confirms a cause, and any declared merges agree with the two trees.
 * With `requireMerge` the submit must declare a merge, and with `requireCausalPath` a confirmed
 * response must come with a causal path; both are round-level rules the caller sets for the seeded
 * tree only. Whether those merges and paths are the right ones for the investigation is the LLM
 * judge's job.
 */
export const gradeSubmissions = ({
  submissions,
  prior,
  submitted,
  response,
  requireMerge = false,
  requireCausalPath = true,
}: {
  submissions: SubmitArguments[];
  prior: DecisionTreeView | undefined;
  submitted: DecisionTreeView | undefined;
  response: string;
  requireMerge?: boolean;
  requireCausalPath?: boolean;
}): { score: 0 | 1; explanation: string } => {
  if (submissions.length === 0) {
    return {
      score: 0,
      explanation: `The reinforcement agent did not call ${SUBMIT_TOOL}.`,
    };
  }

  const last = submissions[submissions.length - 1];
  const problems: string[] = [];
  const treeId = submitted?.tree_id ?? prior?.tree_id;
  if (!submitted || !treeId) {
    problems.push('The submitted tree could not be parsed.');
  } else {
    const effective = effectiveSubmission(submissions, submitted);
    problems.push(...traversalProblems(effective, treeId, response, requireCausalPath));
    problems.push(...mergeProblems(effective, prior, submitted));
    problems.push(...pathProblems(effective, submitted));
    if (requireMerge && !declaresMerge(effective, treeId)) {
      problems.push(`This round folds duplicate nodes in ${treeId}, but merged_nodes is empty.`);
    }
  }

  const rendered = `Last ${SUBMIT_TOOL} arguments:\n${formatArguments(last)}`;
  if (problems.length > 0) {
    return { score: 0, explanation: `${problems.join('\n')}\n\n${rendered}` };
  }
  return {
    score: 1,
    explanation: `Submit arguments are consistent with the prior and submitted trees.\n\n${rendered}`,
  };
};

/**
 * What the tree ended up with across a turn's submit calls. The submit tool keeps a traversal or
 * merge an earlier call saved when a retry leaves it out, so the grade uses the last traversal given
 * for the tree, and the last call's merges plus each earlier merge whose merged-away nodes are gone
 * from the submitted tree. A merge from a rejected attempt the agent then dropped does not count.
 */
const effectiveSubmission = (
  submissions: SubmitArguments[],
  submitted: DecisionTreeView
): SubmitArguments => {
  const last = submissions[submissions.length - 1];
  const remaining = new Set(submitted.nodes.map((node) => node.node_id));
  const lastMerges = (last.symptom_trees ?? []).flatMap((tree) => tree.merged_nodes ?? []);
  const applied = submissions
    .slice(0, -1)
    .flatMap((submission) => submission.symptom_trees ?? [])
    .flatMap((tree) => tree.merged_nodes ?? [])
    .filter(
      (merge) =>
        (merge.from ?? []).length > 0 && (merge.from ?? []).every((id) => !remaining.has(id))
    );
  const merges = [...lastMerges];
  const absorbed = new Set(lastMerges.flatMap((merge) => merge.from ?? []));
  for (const merge of applied) {
    if ((merge.from ?? []).some((id) => absorbed.has(id))) continue;
    merges.push(merge);
    for (const id of merge.from ?? []) absorbed.add(id);
  }
  const traversal = submissions
    .flatMap((submission) => submission.traversals ?? [])
    .filter((entry) => namesTree(entry.tree_id, submitted.tree_id))
    .at(-1);
  const namedTrees = submissions.flatMap((submission) => submission.symptom_trees ?? []);
  return {
    ...last,
    symptom_trees: namedTrees.length
      ? [{ ...namedTrees[namedTrees.length - 1], merged_nodes: merges }]
      : [],
    traversals: traversal ? [traversal] : [],
  };
};

const declaresMerge = (submission: SubmitArguments, treeId: string): boolean =>
  (submission.symptom_trees ?? []).some((tree) => {
    if (!namesTree(tree.tree_id, treeId)) return false;
    return (tree.merged_nodes ?? []).some(
      (merge) => (merge.from ?? []).length > 0 && Boolean(merge.into)
    );
  });

const traversalsForTree = (submission: SubmitArguments, treeId: string): TraversalSubmission[] =>
  (submission.traversals ?? []).filter((traversal) => namesTree(traversal.tree_id, treeId));

/**
 * The submit has to name the path this round followed, and a causal path only when it confirmed
 * one. A confirmed cause requires a causal path only when `requireCausalPath` is set.
 */
const traversalProblems = (
  submission: SubmitArguments,
  treeId: string,
  response: string,
  requireCausalPath: boolean
): string[] => {
  const traversals = traversalsForTree(submission, treeId);
  if (traversals.length === 0) {
    return [`The submit has no traversal for ${treeId}.`];
  }
  const confirmed = confirmsCause(response);
  const problems: string[] = [];
  for (const traversal of traversals) {
    if ((traversal.visited_path ?? []).length === 0) {
      problems.push(`visited_path for ${treeId} is empty.`);
    }
    problems.push(
      ...walkEdges(traversal.visited_path, 'visited_path', treeId).problems,
      ...walkEdges(traversal.causal_path, 'causal_path', treeId).problems
    );
    const causal = traversal.causal_path ?? [];
    if (requireCausalPath && confirmed && causal.length === 0) {
      problems.push(`The response confirms a cause, but causal_path for ${treeId} is empty.`);
    }
    if (!confirmed && causal.length > 0) {
      problems.push(`The response does not confirm a cause, but causal_path for ${treeId} is set.`);
    }
  }
  return problems;
};

const mergeProblems = (
  submission: SubmitArguments,
  prior: DecisionTreeView | undefined,
  submitted: DecisionTreeView
): string[] => {
  const problems: string[] = [];
  if (!prior) {
    const declared = (submission.symptom_trees ?? []).some(
      (tree) => namesTree(tree.tree_id, submitted.tree_id) && (tree.merged_nodes ?? []).length > 0
    );
    return declared
      ? ['merged_nodes were declared, but this round has no prior tree to merge.']
      : [];
  }
  const priorIds = new Set(prior.nodes.map((node) => node.node_id));
  const submittedIds = new Set(submitted.nodes.map((node) => node.node_id));
  const absorbed = new Set<string>();

  for (const tree of submission.symptom_trees ?? []) {
    if (!namesTree(tree.tree_id, prior.tree_id)) {
      problems.push(
        `symptom_trees names ${tree.tree_id}, but this round's tree is ${prior.tree_id}.`
      );
    }
    for (const merge of tree.merged_nodes ?? []) {
      const into = merge.into;
      if (!into || !submittedIds.has(into)) {
        problems.push(
          `merged_nodes.into ${into || '(missing)'} is not a node of the submitted tree.`
        );
        continue;
      }
      for (const from of merge.from ?? []) {
        if (absorbed.has(from)) problems.push(`Node ${from} is listed in more than one merge.`);
        absorbed.add(from);
        if (from === into) problems.push(`Node ${from} is merged into itself.`);
        if (!priorIds.has(from))
          problems.push(`merged_nodes.from ${from} is not in the prior tree.`);
        if (submittedIds.has(from)) {
          problems.push(`merged_nodes.from ${from} is still in the submitted tree.`);
        }
      }
    }
  }

  return problems;
};

const pathProblems = (submission: SubmitArguments, submitted: DecisionTreeView): string[] => {
  const problems: string[] = [];
  for (const traversal of submission.traversals ?? []) {
    if (!namesTree(traversal.tree_id, submitted.tree_id)) {
      problems.push(
        `traversals names ${traversal.tree_id}, but this round's tree is ${submitted.tree_id}.`
      );
    }
    const visited = walkEdges(traversal.visited_path, 'visited_path', submitted.tree_id);
    const causal = walkEdges(traversal.causal_path, 'causal_path', submitted.tree_id);
    problems.push(
      ...visited.problems,
      ...causal.problems,
      ...unresolved(submitted, visited.refs, 'visited_path'),
      ...unresolved(submitted, causal.refs, 'causal_path'),
      ...unmarkedCausal(submitted, causal.refs)
    );
  }
  return problems;
};

const unresolved = (tree: DecisionTreeView, refs: DecisionEdgeRef[], label: string): string[] => {
  if (refs.length === 0) return [];
  try {
    resolveEdgeRefs(tree, refs);
    return [];
  } catch (error) {
    const message = error instanceof DecisionTreeValidationError ? error.message : String(error);
    return [`${label} does not match the submitted tree: ${message}`];
  }
};

const unmarkedCausal = (tree: DecisionTreeView, refs: DecisionEdgeRef[]): string[] => {
  if (refs.length === 0) return [];
  let edges;
  try {
    edges = resolveEdgeRefs(tree, refs);
  } catch {
    return [];
  }
  const unmarked = edges.filter((edge) => !edge.is_taken);
  if (unmarked.length === 0) return [];
  return [
    `causal_path edges must carry ✅: ${unmarked
      .map((edge) => `${edge.source_node_id} --> ${edge.target_node_id}`)
      .join(', ')}`,
  ];
};
