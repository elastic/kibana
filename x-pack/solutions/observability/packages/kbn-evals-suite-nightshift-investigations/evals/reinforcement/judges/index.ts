/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import pRetry from 'p-retry';
import type { EvalConnector, Evaluator } from '@kbn/evals';
import { buildModelFromConnector } from '@kbn/evals';
import {
  confirmsCause,
  gradeSubmissions,
  isSeededTree,
  parseTreeMarkdown,
  submissionsForTree,
} from '../arguments';
import {
  checkCausalPathMarked,
  checkMergesDeclared,
  checkNoVisitedCheckmarks,
  checkReinforcementDetected,
  checkStructurePreserved,
  gradedTrees,
} from '../checks';
import type { CheckContext, CheckResult } from '../checks';
import type { ReinforcementTaskOutput } from '../types';

export const SUBMIT_ARGUMENTS_EVALUATOR = 'submit_arguments_consistent';
export const MERGED_NODES_EVALUATOR = 'merged_nodes_and_paths';
export const NO_VISITED_CHECKMARKS_EVALUATOR = 'no_visited_checkmarks';
export const CAUSAL_PATH_MARKED_EVALUATOR = 'causal_path_marked';
export const STRUCTURE_PRESERVED_EVALUATOR = 'structure_preserved';
export const REINFORCEMENT_DETECTED_EVALUATOR = 'reinforcement_detected';
export const MERGES_DECLARED_EVALUATOR = 'merges_declared';

/** The #573 prompt checks and the merge gate; every scored run must pass each one. */
export const PROMPT_CHECK_EVALUATORS = [
  NO_VISITED_CHECKMARKS_EVALUATOR,
  CAUSAL_PATH_MARKED_EVALUATOR,
  STRUCTURE_PRESERVED_EVALUATOR,
  REINFORCEMENT_DETECTED_EVALUATOR,
  MERGES_DECLARED_EVALUATOR,
] as const;

interface ReinforcementEvalExample {
  input: {
    question: string;
    response?: string;
    prior_tree?: { tree_id?: string };
    follow_up?: { causal_confirmed: boolean };
  };
  metadata?: { case_id?: string; require_merge?: boolean };
}

type ReinforcementEvaluator = Evaluator<ReinforcementEvalExample, ReinforcementTaskOutput>;

const responseOf = (
  input: ReinforcementEvalExample['input'],
  output: ReinforcementTaskOutput
): string => output.response || input.response || '';

/** The round's causal verdict: what the task recorded, else the follow-up input, else the response. */
const causalConfirmedFor = (
  input: ReinforcementEvalExample['input'],
  output: ReinforcementTaskOutput
): boolean =>
  output.causal_confirmed ??
  input.follow_up?.causal_confirmed ??
  confirmsCause(responseOf(input, output));

const scoreTool = { function: 'score' } as ToolChoice;

const judgePrompt = createPrompt({
  name: 'nightshift_reinforcement_merged_nodes_judge',
  description:
    'Judges whether a reinforcement submit call paths and merged nodes match the investigation.',
  input: lazySchema(() =>
    z.object({
      question: z.string(),
      response: z.string(),
      causal_confirmed: z.string(),
      prior_tree: z.string(),
      submitted_tree: z.string(),
      arguments: z.string(),
    })
  ),
})
  .version({
    system: {
      mustache: {
        template: `You grade one decision-tree reinforcement submit.

The agent was given an investigation round and the prior tree, or no tree when it had to create one. It may edit the tree and must call the submit tool with:
- symptom_trees[].merged_nodes: nodes it folded together. from nodes should be near-duplicates it removed. into is the node that absorbed them. An empty list means it merged nothing.
- traversals[].visited_path: node ids the investigation followed, in order. An object {"id","condition"} is used only when several edges join the previous node to that one.
- traversals[].causal_path: the walk from the symptom node to the end node of the confirmed cause. Empty when the round confirms no cause.

A ✅ at the start of an edge label marks the confirmed causal path and nothing else. Visits are counted outside the tree, so an edge the investigation only visited gets no ✅. A ✅ the prior tree already had is an older mark and is fine.

Judge three things:
- arguments_ok: paths exist for the right reason, and causal_path is present only when the round confirms a cause.
- merges_ok: declared merges collapse nodes that mean the same thing, and a near-duplicate that the round shows is the same event is not left as two causes. Empty merges are correct when nothing overlapped.
- marks_ok: every ✅ the submitted tree adds over the prior tree is on causal_path. Ignore ✅ the prior tree already had.

Cite the node ids you used.`,
      },
    },
    template: {
      mustache: {
        template: `## Investigation question
{{{question}}}

## Investigator response
{{{response}}}

## Root cause confirmed this round
{{{causal_confirmed}}}

## Prior tree
{{{prior_tree}}}

## Submitted tree
{{{submitted_tree}}}

## Submit arguments
{{{arguments}}}

Call the score tool.`,
      },
    },
    tools: {
      score: {
        description: 'Return whether the paths, merged nodes and ✅ marks match the investigation.',
        schema: {
          type: 'object',
          properties: {
            arguments_ok: { type: 'boolean' },
            merges_ok: { type: 'boolean' },
            marks_ok: { type: 'boolean' },
            reasoning: { type: 'string' },
          },
          required: ['arguments_ok', 'merges_ok', 'marks_ok', 'reasoning'],
        },
      },
    },
  } as const)
  .get();

export const submitArgumentsEvaluator: ReinforcementEvaluator = {
  name: SUBMIT_ARGUMENTS_EVALUATOR,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, output, metadata }) => {
    if (output.execution_error) {
      return { score: 0, explanation: output.execution_error };
    }
    const response = responseOf(input, output);
    const confirmed = causalConfirmedFor(input, output);
    const trees = gradedTrees(output);
    // The round's merge and causal-path rules describe the seeded tree, not every tree it visited.
    const graded = trees.map((tree) => {
      const seeded = isSeededTree(input.prior_tree?.tree_id, tree.tree_id);
      return gradeSubmissions({
        submissions: submissionsForTree(output.submissions, tree.tree_id),
        prior: parseTreeMarkdown(tree.prior_mermaid, tree.tree_id),
        submitted: parseTreeMarkdown(tree.submitted_mermaid, tree.tree_id),
        response,
        requireMerge: seeded && metadata?.require_merge === true,
        requireCausalPath: seeded,
        causalConfirmed: confirmed,
      });
    });
    if (trees.length === 0) {
      graded.push(
        gradeSubmissions({
          submissions: output.submissions,
          prior: undefined,
          submitted: undefined,
          response,
          causalConfirmed: confirmed,
        })
      );
    }
    // A round with no seed creates trees, so a confirmed cause needs a causal path on any tree it named.
    if (!input.prior_tree?.tree_id && confirmed) {
      const causal = trees.some((tree) =>
        (submissionsForTree(output.submissions, tree.tree_id).at(-1)?.traversals ?? []).some(
          (traversal) => (traversal.causal_path ?? []).length > 0
        )
      );
      if (!causal) {
        graded.push({
          score: 0,
          explanation: 'The round confirms a cause, but no tree has a causal_path.',
        });
      }
    }
    const failed = graded.filter((result) => result.score !== 1);
    return {
      score: failed.length === 0 ? 1 : 0,
      explanation: (failed.length > 0 ? failed : graded)
        .map((result) => result.explanation)
        .join('\n\n'),
      metadata: {
        case_id: metadata?.case_id,
        submission_count: output.submissions.length,
      },
    };
  },
};

const checkEvaluator = (
  name: string,
  check: (context: CheckContext) => CheckResult,
  { onlyWhenMergeRequired = false }: { onlyWhenMergeRequired?: boolean } = {}
): ReinforcementEvaluator => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ input, output, metadata }) => {
    // An unfinished run is already a miss on the submit-arguments rate; it says nothing here.
    if (output.execution_error) {
      return { score: null, label: 'not_run', explanation: output.execution_error };
    }
    if (onlyWhenMergeRequired && metadata?.require_merge !== true) {
      return { score: null, label: 'not_run', explanation: 'The round requires no merge.' };
    }
    const { score, explanation } = check({
      output,
      seededTreeId: input.prior_tree?.tree_id,
      causalConfirmed: causalConfirmedFor(input, output),
    });
    return {
      score,
      label: score === 1 ? 'pass' : 'fail',
      explanation,
      metadata: { case_id: metadata?.case_id },
    };
  },
});

/**
 * Code evaluators for the four #573 micro-evals on the ✅ causal path and the tree structure, plus
 * the merge a `require_merge` round must declare.
 */
export const promptCheckEvaluators: ReinforcementEvaluator[] = [
  checkEvaluator(NO_VISITED_CHECKMARKS_EVALUATOR, checkNoVisitedCheckmarks),
  checkEvaluator(CAUSAL_PATH_MARKED_EVALUATOR, checkCausalPathMarked),
  checkEvaluator(STRUCTURE_PRESERVED_EVALUATOR, checkStructurePreserved),
  checkEvaluator(REINFORCEMENT_DETECTED_EVALUATOR, checkReinforcementDetected),
  checkEvaluator(MERGES_DECLARED_EVALUATOR, checkMergesDeclared, { onlyWhenMergeRequired: true }),
];

interface JudgeDeps {
  inferenceClient: BoundInferenceClient;
  evaluationConnector: EvalConnector;
  log: ToolingLog;
}

const getModelFactory = (evaluationConnector: EvalConnector) => () => {
  const model = buildModelFromConnector(evaluationConnector);
  if (!model.id) return undefined;
  return {
    id: model.id,
    ...(model.family ? { family: model.family } : {}),
    ...(model.provider ? { provider: model.provider } : {}),
  };
};

export const createMergedNodesEvaluator = ({
  inferenceClient,
  evaluationConnector,
  log,
}: JudgeDeps): ReinforcementEvaluator => ({
  name: MERGED_NODES_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(evaluationConnector),
  evaluate: async ({ input, output }) => {
    if (output.execution_error || output.submissions.length === 0) {
      return {
        score: 0,
        label: 'not_submitted',
        explanation: output.execution_error || 'No submit arguments to judge.',
      };
    }
    const last = output.submissions[output.submissions.length - 1];
    const judged = await withActiveInferenceSpan(
      MERGED_NODES_EVALUATOR,
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
      () =>
        pRetry(
          async () => {
            const response = await inferenceClient.prompt({
              prompt: judgePrompt,
              input: {
                question: input.question,
                response: responseOf(input, output),
                causal_confirmed: causalConfirmedFor(input, output) ? 'yes' : 'no',
                prior_tree: output.prior_mermaid || '(none: the round created a new tree)',
                submitted_tree: output.submitted_mermaid ?? '',
                arguments: JSON.stringify(last),
              },
              toolChoice: scoreTool,
            });
            const toolCall = response.toolCalls[0];
            if (!toolCall) throw new Error('No tool call returned by the merged-nodes judge');
            return toolCall.function.arguments as {
              arguments_ok?: boolean;
              merges_ok?: boolean;
              marks_ok?: boolean;
              reasoning?: string;
            };
          },
          {
            retries: 3,
            onFailedAttempt: (error) => {
              log.warning(
                `${MERGED_NODES_EVALUATOR} attempt ${error.attemptNumber} failed: ${error.message}`
              );
            },
          }
        )
    );
    // The score is the share of passed criteria, not a number the model picks.
    const verdicts = {
      arguments_ok: judged.arguments_ok === true,
      merges_ok: judged.merges_ok === true,
      marks_ok: judged.marks_ok === true,
    };
    const values = Object.values(verdicts);
    const passed = values.filter(Boolean).length;
    return {
      score: passed / values.length,
      label: passed === values.length ? 'pass' : 'fail',
      explanation: judged.reasoning ?? '',
      metadata: verdicts,
    };
  },
});
