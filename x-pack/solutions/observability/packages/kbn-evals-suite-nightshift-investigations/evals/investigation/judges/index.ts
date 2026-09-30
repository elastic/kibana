/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import pRetry from 'p-retry';
import type { Evaluator } from '@kbn/evals';
import { buildModelFromConnector } from '@kbn/evals';
import type { EvalConnector } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';
import {
  AntiLeakageJudgePrompt,
  CauseCompletenessJudgePrompt,
  DecisionTreeHelpfulnessJudgePrompt,
  GoalPassJudgePrompt,
  TruthfulnessJudgePrompt,
} from './prompts';
import {
  buildJudgeInputs,
  clampUnitScore,
  goalScorePassed,
  normalizeDecisionTreeHelpfulnessScore,
  normalizeGoalScore,
  normalizeTruthfulnessScore,
} from './scoring';

export const GOAL_PASS_EVALUATOR = 'goal_pass';
export const CAUSE_COMPLETENESS_EVALUATOR = 'rca_cause_completeness';
export const ANTI_LEAKAGE_EVALUATOR = 'rca_anti_leakage';
export const TRUTHFULNESS_EVALUATOR = 'truthfulness';
export const DECISION_TREE_HELPFULNESS_EVALUATOR = 'decision_tree_helpfulness';

type InvestigationEvaluator = Evaluator<InvestigationExample, InvestigationTaskOutput>;

interface JudgeDeps {
  inferenceClient: BoundInferenceClient;
  evaluationConnector: EvalConnector;
  log: ToolingLog;
}

const scoreTool = { function: 'score' } as ToolChoice;

/** Model attribution matching the built-in `evaluators` fixture (`toScoreModel(...)`). */
const getModelFactory = (evaluationConnector: EvalConnector) => () => {
  const model = buildModelFromConnector(evaluationConnector);
  if (!model.id) return undefined;
  return {
    id: model.id,
    ...(model.family ? { family: model.family } : {}),
    ...(model.provider ? { provider: model.provider } : {}),
  };
};

/**
 * Runs one judge prompt with retries and returns the first tool call's arguments.
 *
 * The `inferenceClient.prompt` REST call does not create a client-side inference span, so it must
 * run inside an active inference span for the server-side `gen_ai` chat span to be captured under
 * this evaluator's trace (and exported to the tracing cluster). This mirrors the built-in kbn-evals
 * LLM evaluators, which get the same span via `executeUntilValid` → `withActiveInferenceSpan`.
 * Without this wrap the judge model call emits no queryable `gen_ai` span.
 */
const invokeJudge = async <TArgs>(
  { inferenceClient, log }: Pick<JudgeDeps, 'inferenceClient' | 'log'>,
  name: string,
  prompt: Parameters<BoundInferenceClient['prompt']>[0]['prompt'],
  input: Record<string, unknown>
): Promise<TArgs> =>
  withActiveInferenceSpan(
    name,
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
    () =>
      pRetry(
        async () => {
          const response = await inferenceClient.prompt({ prompt, input, toolChoice: scoreTool });
          const toolCall = response.toolCalls[0];
          if (!toolCall) throw new Error(`No tool call returned by the ${name} judge`);
          return toolCall.function.arguments as TArgs;
        },
        {
          retries: 3,
          onFailedAttempt: (error) => {
            log.warning(`${name} judge attempt ${error.attemptNumber} failed: ${error.message}`);
          },
        }
      )
  );

export const createGoalPassEvaluator = (deps: JudgeDeps): InvestigationEvaluator => ({
  name: GOAL_PASS_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output, expected, metadata }) => {
    const judge = buildJudgeInputs(input, output, expected, metadata);
    if (judge.executionError || !judge.answer) {
      return {
        score: 0,
        label: 'fail',
        explanation: judge.executionError
          ? `Execution error before goal evaluation: ${judge.executionError}`
          : 'Investigation produced no answer to evaluate.',
        metadata: { raw_score: null, passed: false },
      };
    }
    if (!judge.reference) {
      return {
        score: null,
        label: 'n/a',
        explanation: 'Example is missing a reference answer; goal_pass cannot be scored.',
      };
    }
    const { score: rawScore, summary } = await invokeJudge<{ score: number; summary: string }>(
      deps,
      GOAL_PASS_EVALUATOR,
      GoalPassJudgePrompt,
      {
        question: judge.question,
        reference: judge.reference,
        answer: judge.answer,
      }
    );
    const passed = goalScorePassed(rawScore);
    return {
      score: normalizeGoalScore(rawScore),
      label: passed ? 'pass' : 'fail',
      explanation: summary,
      metadata: { raw_score: rawScore, passed },
    };
  },
});

export const createCauseCompletenessEvaluator = (deps: JudgeDeps): InvestigationEvaluator => ({
  name: CAUSE_COMPLETENESS_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output, expected, metadata }) => {
    const judge = buildJudgeInputs(input, output, expected, metadata);
    if (!judge.answer || !judge.reference) {
      return {
        score: null,
        label: 'n/a',
        explanation: !judge.reference
          ? 'Example is missing a reference answer; cause completeness cannot be scored.'
          : 'Investigation produced no answer to evaluate.',
      };
    }
    const result = await invokeJudge<{
      reference_mechanism_class: string;
      agent_mechanism_class: string;
      is_combined_cause: boolean;
      cause_completeness_score: number;
      reasoning: string;
    }>(deps, CAUSE_COMPLETENESS_EVALUATOR, CauseCompletenessJudgePrompt, {
      question: judge.question,
      reference: judge.reference,
      answer: judge.answer,
      evidence: judge.evidence,
    });
    return {
      score: clampUnitScore(result.cause_completeness_score),
      label: result.is_combined_cause ? 'combined_cause' : 'single_cause',
      explanation: `is_combined=${result.is_combined_cause} reference=${result.reference_mechanism_class} agent=${result.agent_mechanism_class} — ${result.reasoning}`,
      metadata: {
        is_combined_cause: result.is_combined_cause,
        reference_mechanism_class: result.reference_mechanism_class,
        agent_mechanism_class: result.agent_mechanism_class,
      },
    };
  },
});

export const createAntiLeakageEvaluator = (deps: JudgeDeps): InvestigationEvaluator => ({
  name: ANTI_LEAKAGE_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output, expected, metadata }) => {
    const judge = buildJudgeInputs(input, output, expected, metadata);
    if (!judge.answer) {
      return {
        score: null,
        label: 'n/a',
        explanation: 'Investigation produced no answer to evaluate.',
      };
    }
    const result = await invokeJudge<{ leaked_root_cause: boolean; reasoning: string }>(
      deps,
      ANTI_LEAKAGE_EVALUATOR,
      AntiLeakageJudgePrompt,
      { question: judge.question, evidence: judge.evidence }
    );
    return {
      score: result.leaked_root_cause ? 0 : 1,
      label: result.leaked_root_cause ? 'leakage' : 'no_leakage',
      explanation: result.reasoning,
      metadata: { llm_confirmed: true },
    };
  },
});

export const createTruthfulnessEvaluator = (deps: JudgeDeps): InvestigationEvaluator => ({
  name: TRUTHFULNESS_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output, expected, metadata }) => {
    const judge = buildJudgeInputs(input, output, expected, metadata);
    if (judge.executionError || !judge.answer) {
      return {
        score: judge.executionError ? 0 : null,
        label: judge.executionError ? 'fail' : 'n/a',
        explanation: judge.executionError
          ? `Execution error before truthfulness evaluation: ${judge.executionError}`
          : 'Investigation produced no answer to evaluate.',
        metadata: { raw_score: null },
      };
    }
    const { score: rawScore, summary } = await invokeJudge<{ score: number; summary: string }>(
      deps,
      TRUTHFULNESS_EVALUATOR,
      TruthfulnessJudgePrompt,
      {
        question: judge.question,
        answer: judge.answer,
        evidence: judge.evidence,
      }
    );
    return {
      score: normalizeTruthfulnessScore(rawScore),
      label: 'truthfulness',
      explanation: summary,
      metadata: { raw_score: rawScore },
    };
  },
});

export const createDecisionTreeHelpfulnessEvaluator = (
  deps: JudgeDeps
): InvestigationEvaluator => ({
  name: DECISION_TREE_HELPFULNESS_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output, expected, metadata }) => {
    const judge = buildJudgeInputs(input, output, expected, metadata);
    if (judge.executionError || !judge.answer) {
      return {
        score: judge.executionError ? 0 : null,
        label: judge.executionError ? 'fail' : 'n/a',
        explanation: judge.executionError
          ? `Execution error before decision tree helpfulness evaluation: ${judge.executionError}`
          : 'Investigation produced no answer to evaluate.',
      };
    }
    if (!judge.hasDecisionTrees) {
      return {
        score: null,
        label: 'n/a',
        explanation: 'Investigation did not open any decision tree.',
        metadata: { contribution_type: 'not_used' },
      };
    }
    const result = await invokeJudge<{
      was_helpful: boolean;
      helpfulness_score: number;
      contribution_type: string;
      reasoning: string;
    }>(deps, DECISION_TREE_HELPFULNESS_EVALUATOR, DecisionTreeHelpfulnessJudgePrompt, {
      question: judge.question,
      decisionTrees: judge.decisionTrees,
      answer: judge.answer,
      evidence: judge.evidence,
    });
    return {
      score: normalizeDecisionTreeHelpfulnessScore(result.helpfulness_score),
      label: result.was_helpful ? 'helpful' : 'not_helpful',
      explanation: result.reasoning,
      metadata: {
        raw_score: result.helpfulness_score,
        contribution_type: result.contribution_type,
      },
    };
  },
});

/** The ported RCA judges plus truthfulness and decision-tree helpfulness, in stable order for the investigation spec. */
export const createInvestigationJudges = (deps: JudgeDeps): InvestigationEvaluator[] => [
  createGoalPassEvaluator(deps),
  createCauseCompletenessEvaluator(deps),
  createAntiLeakageEvaluator(deps),
  createTruthfulnessEvaluator(deps),
  createDecisionTreeHelpfulnessEvaluator(deps),
];
