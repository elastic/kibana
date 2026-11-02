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
import { NO_CONCLUSION_ERROR } from '../task';
import { composeRecallReadsText, extractRecallReads } from '../recall_evidence';
import {
  AntiLeakageJudgePrompt,
  CauseCompletenessJudgePrompt,
  CORTEX_INFLUENCE_TYPES,
  DecisionTreeHelpfulnessJudgePrompt,
  GoalPassJudgePrompt,
  RecallUsageJudgePrompt,
  ToolCallHealthJudgePrompt,
  TruthfulnessJudgePrompt,
} from './prompts';
import type { JudgeInputs } from './scoring';
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
export const TOOL_CALLS_FAILED_EVALUATOR = 'tool_calls_failed';
export const TOOL_CALLS_EMPTY_EVALUATOR = 'tool_calls_empty';
export const CORTEX_CHANGED_DIRECTION_EVALUATOR = 'cortex_changed_direction';
export const MEMORIES_CITED_EVALUATOR = 'memories_cited_in_answer';

type InvestigationEvaluator = Evaluator<InvestigationExample, InvestigationTaskOutput>;

interface JudgeDeps {
  inferenceClient: BoundInferenceClient;
  evaluationConnector: EvalConnector;
  log: ToolingLog;
}

const scoreTool = { function: 'score' } as ToolChoice;

/**
 * An execution error that leaves nothing to grade. A run that only failed to record its verdict
 * still recorded hypotheses, so it is graded on those and labelled `no_verdict`.
 */
const fatalExecutionError = ({ executionError }: JudgeInputs): string | undefined =>
  executionError === NO_CONCLUSION_ERROR ? undefined : executionError;

const NO_VERDICT_PREFIX = 'No verdict was recorded; graded the recorded hypotheses. ';

const NO_TRAJECTORY_EXPLANATION =
  'No tool-call trajectory was captured for this run, so what the agent accessed cannot be judged.';

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
    const executionError = fatalExecutionError(judge);
    if (executionError || !judge.answer) {
      return {
        score: 0,
        label: 'fail',
        explanation: executionError
          ? `Execution error before goal evaluation: ${executionError}`
          : 'Investigation produced no answer to evaluate.',
        metadata: { raw_score: null, passed: false },
      };
    }
    const noVerdict = Boolean(judge.executionError);
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
      explanation: noVerdict ? `${NO_VERDICT_PREFIX}${summary}` : summary,
      metadata: { raw_score: rawScore, passed, no_verdict: noVerdict },
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
    if (!judge.answer || !judge.trajectory) {
      return {
        score: null,
        label: 'n/a',
        explanation: !judge.answer
          ? 'Investigation produced no answer to evaluate.'
          : NO_TRAJECTORY_EXPLANATION,
      };
    }
    const result = await invokeJudge<{ leaked_root_cause: boolean; reasoning: string }>(
      deps,
      ANTI_LEAKAGE_EVALUATOR,
      AntiLeakageJudgePrompt,
      { question: judge.question, trajectory: judge.trajectory }
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
    const executionError = fatalExecutionError(judge);
    if (executionError || !judge.answer) {
      return {
        score: executionError ? 0 : null,
        label: executionError ? 'fail' : 'n/a',
        explanation: executionError
          ? `Execution error before truthfulness evaluation: ${executionError}`
          : 'Investigation produced no answer to evaluate.',
        metadata: { raw_score: null },
      };
    }
    if (!judge.trajectory) {
      return {
        score: null,
        label: 'n/a',
        explanation: NO_TRAJECTORY_EXPLANATION,
        metadata: { raw_score: null },
      };
    }
    const noVerdict = Boolean(judge.executionError);
    const result = await invokeJudge<{
      score: number;
      did_real_work: boolean;
      evidence_source: string;
      summary: string;
    }>(deps, TRUTHFULNESS_EVALUATOR, TruthfulnessJudgePrompt, {
      question: judge.question,
      answer: judge.answer,
      evidence: judge.evidence,
      trajectory: judge.trajectory,
    });
    return {
      score: normalizeTruthfulnessScore(result.score),
      label: result.did_real_work ? 'real_work' : 'no_real_work',
      explanation: noVerdict ? `${NO_VERDICT_PREFIX}${result.summary}` : result.summary,
      metadata: {
        raw_score: result.score,
        did_real_work: result.did_real_work,
        evidence_source: result.evidence_source,
        no_verdict: noVerdict,
      },
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
    if (!judge.hasDecisionTrees) {
      return {
        score: null,
        label: 'n/a',
        explanation: 'Investigation did not open any decision tree.',
        metadata: { contribution_type: 'not_used' },
      };
    }
    const executionError = fatalExecutionError(judge);
    if (executionError || !judge.answer) {
      return {
        score: executionError ? 0 : null,
        label: executionError ? 'fail' : 'n/a',
        explanation: executionError
          ? `Execution error before decision tree helpfulness evaluation: ${executionError}`
          : 'Investigation produced no answer to evaluate.',
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
      trajectory: judge.trajectory,
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

/**
 * Runs `run` once per investigation. Two evaluators fed by one judge call share its verdict, so
 * the judge isn't paid for twice; a run without an investigation id can't be keyed and isn't shared.
 */
const createRunMemo = <T>() => {
  const cache = new Map<string, Promise<T>>();
  return (output: InvestigationTaskOutput, run: () => Promise<T>): Promise<T> => {
    const key = output.investigation_id;
    if (!key) return run();
    const cached = cache.get(key);
    if (cached) return cached;
    const pending = run();
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
    return pending;
  };
};

interface ToolCallIssue {
  step: number;
  reason: string;
}

interface ToolCallHealth {
  failed: ToolCallIssue[];
  empty: ToolCallIssue[];
}

/** Valid, unique issues for steps that exist in the trajectory, in step order. */
const toToolCallIssues = (
  issues: ToolCallIssue[] | undefined,
  stepCount: number,
  excludedSteps: ReadonlySet<number> = new Set()
): ToolCallIssue[] => {
  const byStep = new Map<number, ToolCallIssue>();
  for (const { step, reason } of Array.isArray(issues) ? issues : []) {
    if (!Number.isInteger(step) || step < 1 || step > stepCount) continue;
    if (excludedSteps.has(step) || byStep.has(step)) continue;
    byStep.set(step, { step, reason: String(reason ?? '') });
  }
  return [...byStep.values()].sort((a, b) => a.step - b.step);
};

const toolCallIssueResult = (
  issues: ToolCallIssue[],
  output: InvestigationTaskOutput,
  noun: string
) => ({
  score: issues.length,
  label: issues.length > 0 ? noun : 'none',
  explanation:
    issues.length > 0
      ? issues.map(({ step, reason }) => `step ${step}: ${reason}`).join('\n')
      : `No ${noun} tool calls.`,
  metadata: { steps: issues.map(({ step }) => step), total_tool_calls: output.tool_call_count },
});

/** The task keeps only the trajectory prefix that fits its size budget, so it can be shorter than the run. */
const isTrajectoryTruncated = ({
  tool_call_trajectory: trajectory,
  tool_call_count: toolCallCount,
}: InvestigationTaskOutput): boolean =>
  toolCallCount !== undefined && (trajectory?.length ?? 0) < toolCallCount;

/**
 * `tool_calls_failed` and `tool_calls_empty`, from one LLM read of the trajectory. The default
 * error format isn't enough: a tool can report success while returning only metadata and an empty
 * list, which is still a failed use of the tool.
 */
export const createToolCallHealthEvaluators = (deps: JudgeDeps): InvestigationEvaluator[] => {
  const memo = createRunMemo<ToolCallHealth>();
  const assess = (
    output: InvestigationTaskOutput,
    question: string,
    trajectory: string
  ): Promise<ToolCallHealth> =>
    memo(output, async () => {
      const result = await invokeJudge<{
        failed_calls?: ToolCallIssue[];
        empty_calls?: ToolCallIssue[];
      }>(deps, 'tool_call_health', ToolCallHealthJudgePrompt, { question, trajectory });
      const stepCount = output.tool_call_trajectory?.length ?? 0;
      const failed = toToolCallIssues(result.failed_calls, stepCount);
      const failedSteps = new Set(failed.map(({ step }) => step));
      return { failed, empty: toToolCallIssues(result.empty_calls, stepCount, failedSteps) };
    });

  const create = (
    name: string,
    noun: string,
    pick: (health: ToolCallHealth) => ToolCallIssue[]
  ): InvestigationEvaluator => ({
    name,
    kind: 'LLM',
    direction: 'minimize',
    getModel: getModelFactory(deps.evaluationConnector),
    evaluate: async ({ input, output, expected, metadata }) => {
      const judge = buildJudgeInputs(input, output, expected, metadata);
      if (!judge.trajectory) {
        return { score: null, label: 'n/a', explanation: NO_TRAJECTORY_EXPLANATION };
      }
      if (isTrajectoryTruncated(output)) {
        return {
          score: null,
          label: 'n/a',
          explanation: `Only ${output.tool_call_trajectory?.length} of ${output.tool_call_count} tool calls were captured, so a count of failed or empty calls would miss the rest.`,
        };
      }
      const health = await assess(output, judge.question, judge.trajectory);
      return toolCallIssueResult(pick(health), output, noun);
    },
  });

  return [
    create(TOOL_CALLS_FAILED_EVALUATOR, 'failed', ({ failed }) => failed),
    create(TOOL_CALLS_EMPTY_EVALUATOR, 'no-data', ({ empty }) => empty),
  ];
};

interface RecallUsage {
  cortexInfluence: (typeof CORTEX_INFLUENCE_TYPES)[number];
  cortexReasoning: string;
  citedMemories: string[];
  memoriesReasoning: string;
}

/** The judge may shorten or extend a path; a citation counts when it names a memory file that was read. */
const isSamePath = (cited: string, read: string): boolean =>
  cited === read || read.endsWith(cited) || cited.endsWith(read);

/**
 * `cortex_changed_direction` and `memories_cited_in_answer`, from one LLM read of the trajectory
 * and the final report. Both are n/a when the agent never opened the matching kind of file.
 */
export const createRecallUsageEvaluators = (deps: JudgeDeps): InvestigationEvaluator[] => {
  const memo = createRunMemo<RecallUsage>();
  const assess = (
    output: InvestigationTaskOutput,
    judge: JudgeInputs,
    reads: ReturnType<typeof extractRecallReads>
  ): Promise<RecallUsage> =>
    memo(output, async () => {
      const result = await invokeJudge<{
        cortex_influence?: string;
        cortex_reasoning?: string;
        memories_cited?: string[];
        memories_reasoning?: string;
      }>(deps, 'recall_usage', RecallUsageJudgePrompt, {
        question: judge.question,
        cortexReads: composeRecallReadsText(reads, 'cortex') || '(none)',
        memoryReads: composeRecallReadsText(reads, 'memories') || '(none)',
        answer: judge.answer,
        evidence: judge.evidence,
        trajectory: judge.trajectory,
      });
      const influence = CORTEX_INFLUENCE_TYPES.find((type) => type === result.cortex_influence);
      const memoryPaths = reads.filter(({ kind }) => kind === 'memories').map(({ path }) => path);
      const cited = Array.isArray(result.memories_cited) ? result.memories_cited : [];
      return {
        cortexInfluence: influence ?? 'none',
        cortexReasoning: result.cortex_reasoning ?? '',
        citedMemories: memoryPaths.filter((path) =>
          cited.some((each) => typeof each === 'string' && isSamePath(each, path))
        ),
        memoriesReasoning: result.memories_reasoning ?? '',
      };
    });

  const cortexChangedDirection: InvestigationEvaluator = {
    name: CORTEX_CHANGED_DIRECTION_EVALUATOR,
    kind: 'LLM',
    direction: 'neutral',
    getModel: getModelFactory(deps.evaluationConnector),
    evaluate: async ({ input, output, expected, metadata }) => {
      const judge = buildJudgeInputs(input, output, expected, metadata);
      const reads = extractRecallReads(output.tool_call_trajectory);
      const cortexFiles = reads.filter(({ kind }) => kind === 'cortex').map(({ path }) => path);
      if (!judge.trajectory || cortexFiles.length === 0) {
        return {
          score: null,
          label: 'n/a',
          explanation: judge.trajectory
            ? 'Investigation did not open any cortex file.'
            : NO_TRAJECTORY_EXPLANATION,
        };
      }
      const usage = await assess(output, judge, reads);
      return {
        score: usage.cortexInfluence === 'redirected' ? 1 : 0,
        label: usage.cortexInfluence,
        explanation: usage.cortexReasoning,
        metadata: { cortex_files: cortexFiles },
      };
    },
  };

  const memoriesCited: InvestigationEvaluator = {
    name: MEMORIES_CITED_EVALUATOR,
    kind: 'LLM',
    direction: 'neutral',
    getModel: getModelFactory(deps.evaluationConnector),
    evaluate: async ({ input, output, expected, metadata }) => {
      const judge = buildJudgeInputs(input, output, expected, metadata);
      const reads = extractRecallReads(output.tool_call_trajectory);
      const memoryFiles = reads.filter(({ kind }) => kind === 'memories').map(({ path }) => path);
      if (!judge.trajectory || !judge.answer || memoryFiles.length === 0) {
        return {
          score: null,
          label: 'n/a',
          explanation: !judge.trajectory
            ? NO_TRAJECTORY_EXPLANATION
            : !judge.answer
            ? 'Investigation produced no answer to evaluate.'
            : 'Investigation did not open any memory file.',
        };
      }
      const usage = await assess(output, judge, reads);
      return {
        score: usage.citedMemories.length,
        label: usage.citedMemories.length > 0 ? 'cited' : 'not_cited',
        explanation: usage.memoriesReasoning,
        metadata: { memories_read: memoryFiles, memories_cited: usage.citedMemories },
      };
    },
  };

  return [cortexChangedDirection, memoriesCited];
};

/** The ported RCA judges plus truthfulness, decision-tree helpfulness, tool-call health and recall usage, in stable order for the investigation spec. */
export const createInvestigationJudges = (deps: JudgeDeps): InvestigationEvaluator[] => [
  createGoalPassEvaluator(deps),
  createCauseCompletenessEvaluator(deps),
  createAntiLeakageEvaluator(deps),
  createTruthfulnessEvaluator(deps),
  createDecisionTreeHelpfulnessEvaluator(deps),
  ...createToolCallHealthEvaluators(deps),
  ...createRecallUsageEvaluators(deps),
];
