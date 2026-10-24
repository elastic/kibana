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
} from '@kbn/nightshift-decision-trees';
import type { DecisionEdgeRef, DecisionTreeView } from '@kbn/nightshift-decision-trees';
import type { EdgeRef, SubmitArguments, TraversalSubmission } from './types';

const SUBMIT_TOOL = 'nightshift_submit_optimizer_result';

/**
 * Same signal `deriveCausalConfirmed` uses in the reinforcement turn script: a confirmed
 * hypothesis is what makes a path causal.
 */
const CONFIRMED_CAUSE_RE = /"status"\s*:\s*"confirmed"|\bstatus:\s*['"]?confirmed\b/i;

/** Keeps the merges and traversals that name `treeId`, so one submit can be graded per tree. */
export const submissionsForTree = (
  submissions: SubmitArguments[],
  treeId: string
): SubmitArguments[] =>
  submissions.map((submission) => ({
    ...submission,
    symptom_trees: (submission.symptom_trees ?? []).filter(
      (tree) => !tree.tree_id || tree.tree_id === treeId
    ),
    traversals: (submission.traversals ?? []).filter(
      (traversal) => !traversal.tree_id || traversal.tree_id === treeId
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

const asEdgeRefs = (refs: EdgeRef[] | undefined): DecisionEdgeRef[] =>
  (refs ?? []).flatMap((ref) => {
    if (!ref.source_node_id || !ref.target_node_id) return [];
    return [
      {
        source_node_id: ref.source_node_id,
        target_node_id: ref.target_node_id,
        ...(ref.condition ? { condition: ref.condition } : {}),
      },
    ];
  });

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
 * Structural check of the last submit call against the investigation response, the tree before
 * the run, and the tree after it. A score of 1 means the agent passed a traversal for this tree,
 * the visit path is non-empty, the causal path is present only when the response confirms a
 * cause, and any declared merges agree with the two trees. A round marked `requireMerge` must
 * declare one. Whether those merges and paths are the right ones for the investigation is the
 * LLM judge's job.
 */
export const gradeSubmissions = ({
  submissions,
  prior,
  submitted,
  response,
  requireMerge = false,
}: {
  submissions: SubmitArguments[];
  prior: DecisionTreeView | undefined;
  submitted: DecisionTreeView | undefined;
  response: string;
  requireMerge?: boolean;
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
    problems.push(...traversalProblems(last, treeId, response));
    problems.push(...mergeProblems(last, prior, submitted));
    problems.push(...pathProblems(last, submitted));
    if (requireMerge && !declaresMerge(last, treeId)) {
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

const declaresMerge = (submission: SubmitArguments, treeId: string): boolean =>
  (submission.symptom_trees ?? []).some((tree) => {
    if (tree.tree_id && tree.tree_id !== treeId) return false;
    return (tree.merged_nodes ?? []).some(
      (merge) => (merge.from ?? []).length > 0 && Boolean(merge.into)
    );
  });

const traversalsForTree = (submission: SubmitArguments, treeId: string): TraversalSubmission[] =>
  (submission.traversals ?? []).filter(
    (traversal) => !traversal.tree_id || traversal.tree_id === treeId
  );

/** The submit has to name the path this round followed, and a causal path only when it confirmed one. */
const traversalProblems = (
  submission: SubmitArguments,
  treeId: string,
  response: string
): string[] => {
  const traversals = traversalsForTree(submission, treeId);
  if (traversals.length === 0) {
    return [`The submit has no traversal for ${treeId}.`];
  }
  const confirmed = CONFIRMED_CAUSE_RE.test(response);
  const problems: string[] = [];
  for (const traversal of traversals) {
    if ((traversal.visited_path ?? []).length === 0) {
      problems.push(`visited_path for ${treeId} is empty.`);
    }
    const causal = traversal.causal_path ?? [];
    if (confirmed && causal.length === 0) {
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
      (tree) =>
        (!tree.tree_id || tree.tree_id === submitted.tree_id) &&
        (tree.merged_nodes ?? []).length > 0
    );
    return declared
      ? ['merged_nodes were declared, but this round has no prior tree to merge.']
      : [];
  }
  const priorIds = new Set(prior.nodes.map((node) => node.node_id));
  const submittedIds = new Set(submitted.nodes.map((node) => node.node_id));
  const absorbed = new Set<string>();

  for (const tree of submission.symptom_trees ?? []) {
    if (tree.tree_id && tree.tree_id !== prior.tree_id) {
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
    if (traversal.tree_id && traversal.tree_id !== submitted.tree_id) {
      problems.push(
        `traversals names ${traversal.tree_id}, but this round's tree is ${submitted.tree_id}.`
      );
    }
    problems.push(
      ...unresolved(submitted, asEdgeRefs(traversal.visited_path), 'visited_path'),
      ...unresolved(submitted, asEdgeRefs(traversal.causal_path), 'causal_path'),
      ...unmarkedCausal(submitted, asEdgeRefs(traversal.causal_path))
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
