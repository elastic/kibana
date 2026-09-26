/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { Evaluator } from '@kbn/evals';
import { buildModelFromConnector } from '@kbn/evals';
import type { EvalConnector } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';
import {
  AntiLeakageJudgePrompt,
  CauseCompletenessJudgePrompt,
  GoalPassJudgePrompt,
} from './prompts';
import {
  buildJudgeInputs,
  clampUnitScore,
  goalScorePassed,
  hasLeakageIndicators,
  normalizeGoalScore,
} from './scoring';

export const GOAL_PASS_EVALUATOR = 'goal_pass';
export const CAUSE_COMPLETENESS_EVALUATOR = 'rca_cause_completeness';
export const ANTI_LEAKAGE_EVALUATOR = 'rca_anti_leakage';

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

/** Runs one judge prompt with retries and returns the first tool call's arguments. */
const invokeJudge = async <TArgs>(
  { inferenceClient, log }: Pick<JudgeDeps, 'inferenceClient' | 'log'>,
  name: string,
  prompt: Parameters<BoundInferenceClient['prompt']>[0]['prompt'],
  input: Record<string, unknown>
): Promise<TArgs> =>
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
        category: judge.category ?? 'investigate',
        answer: judge.answer,
        evidence: judge.evidence,
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
    // Fast rule-based path, matching deductive: with no post-incident language anywhere, there is
    // nothing to confirm, so score a clean pass without spending a judge call.
    if (!hasLeakageIndicators(judge.answer) && !hasLeakageIndicators(judge.evidence)) {
      return {
        score: 1,
        label: 'no_leakage',
        explanation: 'no_leakage_detected',
        metadata: { llm_confirmed: false },
      };
    }
    const result = await invokeJudge<{ used_post_incident_evidence: boolean; reasoning: string }>(
      deps,
      ANTI_LEAKAGE_EVALUATOR,
      AntiLeakageJudgePrompt,
      { answer: judge.answer, evidence: judge.evidence }
    );
    return {
      score: result.used_post_incident_evidence ? 0 : 1,
      label: result.used_post_incident_evidence ? 'leakage' : 'no_leakage',
      explanation: result.reasoning,
      metadata: { llm_confirmed: true },
    };
  },
});

/** The three ported RCA judges, in stable order for the investigation spec. */
export const createInvestigationJudges = (deps: JudgeDeps): InvestigationEvaluator[] => [
  createGoalPassEvaluator(deps),
  createCauseCompletenessEvaluator(deps),
  createAntiLeakageEvaluator(deps),
];
