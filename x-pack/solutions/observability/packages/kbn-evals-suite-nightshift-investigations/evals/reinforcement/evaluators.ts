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
import { gradeSubmissions, parseTreeMarkdown, submissionsForTree } from './arguments';
import type { ReinforcementTaskOutput } from './types';

export const SUBMIT_ARGUMENTS_EVALUATOR = 'submit_arguments_consistent';
export const MERGED_NODES_EVALUATOR = 'merged_nodes_and_paths';

interface ReinforcementEvalExample {
  input: { question: string; response?: string };
  metadata?: { case_id?: string };
}

type ReinforcementEvaluator = Evaluator<ReinforcementEvalExample, ReinforcementTaskOutput>;

const scoreTool = { function: 'score' } as ToolChoice;

const judgePrompt = createPrompt({
  name: 'nightshift_reinforcement_merged_nodes_judge',
  description:
    'Judges whether a reinforcement submit call paths and merged nodes match the investigation.',
  input: lazySchema(() =>
    z.object({
      question: z.string(),
      response: z.string(),
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

The agent was given an investigation round and the prior tree. It may edit the tree and must call the submit tool with:
- symptom_trees[].merged_nodes: nodes it folded together. from nodes should be near-duplicates it removed. into is the node that absorbed them. An empty list means it merged nothing.
- traversals[].visited_path: edges the investigation actually followed.
- traversals[].causal_path: only the edges from the symptom to the confirmed end. Empty when the response does not confirm a cause. Those edges should be the ones marked taken in the submitted tree.

Score how well the arguments match the round:
- arguments_ok: paths exist for the right reason, and causal_path is present only when the response confirms a cause.
- merges_ok: declared merges collapse nodes that mean the same thing, and a near-duplicate that the round shows is the same event is not left as two causes. Empty merges are correct when nothing overlapped.

Score 1 when both are ok, 0.5 when one is ok, 0 when neither is. Cite the node ids you used.`,
      },
    },
    template: {
      mustache: {
        template: `## Investigation question
{{{question}}}

## Investigator response
{{{response}}}

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
        description: 'Return whether the paths and merged nodes match the investigation.',
        schema: {
          type: 'object',
          properties: {
            score: { type: 'number', description: '1, 0.5, or 0.' },
            arguments_ok: { type: 'boolean' },
            merges_ok: { type: 'boolean' },
            reasoning: { type: 'string' },
          },
          required: ['score', 'arguments_ok', 'merges_ok', 'reasoning'],
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
    const response = output.response || input.response || '';
    const trees = output.trees?.length
      ? output.trees
      : [
          {
            tree_id: output.tree_id,
            prior_mermaid: output.prior_mermaid,
            submitted_mermaid: output.submitted_mermaid,
          },
        ];
    const graded = trees.map((tree) =>
      gradeSubmissions({
        submissions: submissionsForTree(output.submissions, tree.tree_id),
        prior: parseTreeMarkdown(tree.prior_mermaid, tree.tree_id),
        submitted: parseTreeMarkdown(tree.submitted_mermaid, tree.tree_id),
        response,
      })
    );
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
                response: output.response || input.response || '',
                prior_tree: output.prior_mermaid,
                submitted_tree: output.submitted_mermaid ?? '',
                arguments: JSON.stringify(last),
              },
              toolChoice: scoreTool,
            });
            const toolCall = response.toolCalls[0];
            if (!toolCall) throw new Error('No tool call returned by the merged-nodes judge');
            return toolCall.function.arguments as {
              score: number;
              arguments_ok: boolean;
              merges_ok: boolean;
              reasoning: string;
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
    const score = Math.max(0, Math.min(1, judged.score));
    return {
      score,
      label: judged.merges_ok && judged.arguments_ok ? 'pass' : 'fail',
      explanation: judged.reasoning,
      metadata: { arguments_ok: judged.arguments_ok, merges_ok: judged.merges_ok },
    };
  },
});
