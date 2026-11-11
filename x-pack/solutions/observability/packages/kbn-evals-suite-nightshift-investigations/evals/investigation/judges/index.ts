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
  WIKI_INFLUENCE_TYPES,
  DecisionTreeHelpfulnessJudgePrompt,
  GoalPassJudgePrompt,
  OrcaControlJudgePrompt,
  OrcaFlagsJudgePrompt,
  RecallUsageJudgePrompt,
  ToolCallHealthJudgePrompt,
  TOOL_CALL_WHY_VALUES,
  TruthfulnessJudgePrompt,
} from './prompts';
import {
  scoreOrcaControl,
  scoreOrcaHallucination,
  scoreOrcaRcaAccuracy,
  shrinkQuietWindow,
} from './orca_scoring';
import type { JudgeInputs } from './scoring';
import {
  buildJudgeInputs,
  clampUnitScore,
  composeAnswerText,
  composeEvidenceText,
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
export const ORCA_RCA_ACCURACY_EVALUATOR = 'orca_rca_accuracy';
export const ORCA_HALLUCINATION_EVALUATOR = 'orca_hallucination';
export const ORCA_CONTROL_EVALUATOR = 'orca_control';
const ORCA_FLAGS_JUDGE = 'orca_flags';
export const TOOL_CALLS_FAILED_EVALUATOR = 'tool_calls_failed';
export const TOOL_CALLS_EMPTY_EVALUATOR = 'tool_calls_empty';
export const WIKI_CHANGED_DIRECTION_EVALUATOR = 'wiki_changed_direction';
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

type ToolCallWhy = (typeof TOOL_CALL_WHY_VALUES)[number];

interface ToolCallIssue {
  step: number;
  reason: string;
  why: ToolCallWhy;
}

const isToolCallWhy = (value: unknown): value is ToolCallWhy =>
  TOOL_CALL_WHY_VALUES.some((why) => why === value);

interface ToolCallHealth {
  failed: ToolCallIssue[];
  empty: ToolCallIssue[];
}

/** Valid, unique issues for steps that exist in the trajectory, in step order. */
const toToolCallIssues = (
  issues: Array<Omit<ToolCallIssue, 'why'> & { why?: unknown }> | undefined,
  stepCount: number,
  excludedSteps: ReadonlySet<number> = new Set()
): ToolCallIssue[] => {
  const byStep = new Map<number, ToolCallIssue>();
  for (const { step, reason, why } of Array.isArray(issues) ? issues : []) {
    if (!Number.isInteger(step) || step < 1 || step > stepCount) continue;
    if (excludedSteps.has(step) || byStep.has(step)) continue;
    byStep.set(step, {
      step,
      reason: String(reason ?? ''),
      why: isToolCallWhy(why) ? why : 'other',
    });
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
      ? issues.map(({ step, reason, why }) => `step ${step} (${why}): ${reason}`).join('\n')
      : `No ${noun} tool calls.`,
  metadata: {
    steps: issues.map(({ step }) => step),
    total_tool_calls: output.tool_call_count,
    // How many of these calls left the agent without data for each reason.
    ...Object.fromEntries(
      TOOL_CALL_WHY_VALUES.map((reason) => [
        reason,
        issues.filter(({ why }) => why === reason).length,
      ])
    ),
  },
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
        failed_calls?: Array<Omit<ToolCallIssue, 'why'> & { why?: unknown }>;
        empty_calls?: Array<Omit<ToolCallIssue, 'why'> & { why?: unknown }>;
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
  wikiInfluence: (typeof WIKI_INFLUENCE_TYPES)[number];
  wikiReasoning: string;
  citedMemories: string[];
  memoriesReasoning: string;
}

/** The judge may shorten or extend a path; a citation counts when it names a memory file that was read. */
const isSamePath = (cited: string, read: string): boolean =>
  cited === read || read.endsWith(cited) || cited.endsWith(read);

/**
 * `wiki_changed_direction` and `memories_cited_in_answer`, from one LLM read of the trajectory
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
        wiki_influence?: string;
        wiki_reasoning?: string;
        memories_cited?: string[];
        memories_reasoning?: string;
      }>(deps, 'recall_usage', RecallUsageJudgePrompt, {
        question: judge.question,
        wikiReads: composeRecallReadsText(reads, 'wiki') || '(none)',
        memoryReads: composeRecallReadsText(reads, 'memories') || '(none)',
        answer: judge.answer,
        evidence: judge.evidence,
        trajectory: judge.trajectory,
      });
      const influence = WIKI_INFLUENCE_TYPES.find((type) => type === result.wiki_influence);
      const memoryPaths = reads.filter(({ kind }) => kind === 'memories').map(({ path }) => path);
      const cited = Array.isArray(result.memories_cited) ? result.memories_cited : [];
      return {
        wikiInfluence: influence ?? 'none',
        wikiReasoning: result.wiki_reasoning ?? '',
        citedMemories: memoryPaths.filter((path) =>
          cited.some((each) => typeof each === 'string' && isSamePath(each, path))
        ),
        memoriesReasoning: result.memories_reasoning ?? '',
      };
    });

  const wikiChangedDirection: InvestigationEvaluator = {
    name: WIKI_CHANGED_DIRECTION_EVALUATOR,
    kind: 'LLM',
    direction: 'neutral',
    getModel: getModelFactory(deps.evaluationConnector),
    evaluate: async ({ input, output, expected, metadata }) => {
      const judge = buildJudgeInputs(input, output, expected, metadata);
      const reads = extractRecallReads(output.tool_call_trajectory);
      const wikiFiles = reads.filter(({ kind }) => kind === 'wiki').map(({ path }) => path);
      if (!judge.trajectory || wikiFiles.length === 0) {
        return {
          score: null,
          label: 'n/a',
          explanation: judge.trajectory
            ? 'Investigation did not open any wiki file.'
            : NO_TRAJECTORY_EXPLANATION,
        };
      }
      const usage = await assess(output, judge, reads);
      return {
        score: usage.wikiInfluence === 'redirected' ? 1 : 0,
        label: usage.wikiInfluence,
        explanation: usage.wikiReasoning,
        metadata: { wiki_files: wikiFiles },
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

  return [wikiChangedDirection, memoriesCited];
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

const stringList = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;

const isOrcaControl = (metadata: InvestigationExample['metadata']): boolean =>
  metadata.control === true ||
  metadata.task_type === 'control' ||
  metadata.no_incident === true ||
  metadata.section === 'control';

type InvestigationTaskReport = NonNullable<InvestigationTaskOutput['structured_report']>;

/** A default severity alone is not a report. */
const reportHasFindings = (
  report: InvestigationTaskOutput['structured_report']
): report is InvestigationTaskReport =>
  Boolean(report?.conclusion || report?.summary || report?.hypotheses?.length);

/**
 * Why ORCA cannot score a run, or undefined when it can. A run that crashed, timed out, or ended
 * without recording anything has no answer, and reading it as an empty one would pass a control.
 * ORCA leaves such trials out; `execution_success` still counts them.
 */
const orcaUnscoredReason = ({
  execution_error: executionError,
  structured_report: report,
  report_truncated: reportTruncated,
}: InvestigationTaskOutput): string | undefined => {
  // An oversized report keeps only its summary and conclusion, so a recorded cause may be missing.
  if (reportTruncated) return 'the report was too large to keep its hypotheses';
  if (!executionError) return undefined;
  if (executionError === NO_CONCLUSION_ERROR && reportHasFindings(report)) return undefined;
  return executionError;
};

/**
 * The whole report, as ORCA's control judge reads the agent's report file: the answer plus its
 * evidence, impact summary and proposals, so a claim of active impact anywhere in it is seen.
 */
const composeOrcaControlReport = (report: InvestigationTaskOutput['structured_report']): string =>
  [composeAnswerText(report), composeEvidenceText(report)].filter(Boolean).join('\n\nEvidence:\n');

const unscored = (reason: string) => ({
  score: null,
  label: 'unscored',
  explanation: `The run did not finish, so ORCA does not score it: ${reason}`,
});

/**
 * The quiet window as ORCA shows it to its control judge: each defined bound moved ten minutes
 * inward, and a missing bound rendered as `null` (open-ended). Undefined without a quiet window.
 */
const orcaQuietWindowBounds = (
  metadata: InvestigationExample['metadata']
): { start: string; end: string } | undefined => {
  const window = metadata.quiet_window;
  if (window === null || typeof window !== 'object' || Array.isArray(window)) return undefined;
  const { start, end } = shrinkQuietWindow(window) as { start?: unknown; end?: unknown };
  const bound = (value: unknown) => (typeof value === 'string' && value ? value : 'null');
  return { start: bound(start), end: bound(end) };
};

const extractReference = (expected: InvestigationExample['output']): string => {
  const reference = expected?.reference_answer;
  return typeof reference === 'string' ? reference : '';
};

interface OrcaFlagsExtraction {
  named_flags: unknown;
  named_causes: unknown;
  reasoning: string;
}

/**
 * One flag extraction per report, so accuracy and hallucination read the same judgement. The runner
 * spreads a new `output` for each evaluator, but `structured_report` stays the same object.
 */
const createOrcaFlagsExtractor = (deps: JudgeDeps) => {
  const extractions = new WeakMap<InvestigationTaskReport, Promise<OrcaFlagsExtraction>>();
  return (
    flags: string[],
    expected: InvestigationExample['output'],
    report: InvestigationTaskReport
  ): Promise<OrcaFlagsExtraction> => {
    const extraction =
      extractions.get(report) ??
      invokeJudge<OrcaFlagsExtraction>(deps, ORCA_FLAGS_JUDGE, OrcaFlagsJudgePrompt, {
        plausibleFlags: flags.join(', '),
        reference: extractReference(expected),
        answer: composeAnswerText(report),
      });
    extractions.set(report, extraction);
    return extraction;
  };
};

/** ORCA set scores. `goal_pass` still scores the single best hypothesis. */
export const createOrcaEvaluators = (deps: JudgeDeps): InvestigationEvaluator[] => {
  const extractFlags = createOrcaFlagsExtractor(deps);
  return [
    {
      name: ORCA_RCA_ACCURACY_EVALUATOR,
      kind: 'LLM',
      direction: 'maximize',
      getModel: getModelFactory(deps.evaluationConnector),
      evaluate: async ({ output, expected, metadata }) => {
        const flags = stringList(metadata.plausible_flags);
        if (!flags?.length || isOrcaControl(metadata)) {
          return {
            score: null,
            label: 'n/a',
            explanation: 'RCA accuracy applies to an incident with a non-empty plausible flag set.',
          };
        }
        const unscoredReason = orcaUnscoredReason(output);
        if (unscoredReason) return unscored(unscoredReason);
        const report = output.structured_report;
        if (!reportHasFindings(report)) {
          return {
            score: 0,
            label: 'fail',
            explanation: 'The report names none of the plausible flags.',
          };
        }
        const { named_flags: namedFlags, reasoning } = await extractFlags(flags, expected, report);
        const named = stringList(namedFlags);
        if (!named) throw new Error('ORCA accuracy judge returned no flag list');
        const score = scoreOrcaRcaAccuracy({ plausibleFlags: flags, namedFlags: named });
        return {
          score,
          label: score === 1 ? 'pass' : 'fail',
          explanation: reasoning,
          metadata: { plausible_flags: flags, named_flags: named },
        };
      },
    },
    {
      name: ORCA_HALLUCINATION_EVALUATOR,
      kind: 'LLM',
      direction: 'minimize',
      getModel: getModelFactory(deps.evaluationConnector),
      evaluate: async ({ output, expected, metadata }) => {
        const flags = stringList(metadata.plausible_flags);
        if (isOrcaControl(metadata)) {
          return {
            score: null,
            label: 'n/a',
            explanation: 'Hallucination applies to an incident, not a control.',
          };
        }
        if (!flags) {
          return {
            score: null,
            label: 'n/a',
            explanation: 'Hallucination needs the example plausible flag set.',
          };
        }
        const unscoredReason = orcaUnscoredReason(output);
        if (unscoredReason) return unscored(unscoredReason);
        const report = output.structured_report;
        if (!reportHasFindings(report)) {
          return { score: 0, label: 'pass', explanation: 'The report names no cause.' };
        }
        const extraction = await extractFlags(flags, expected, report);
        const namedCauses = stringList(extraction.named_causes);
        const namedFlags = stringList(extraction.named_flags);
        if (!namedCauses || !namedFlags) {
          throw new Error('ORCA hallucination judge returned no cause list');
        }
        const score = scoreOrcaHallucination({
          plausibleFlags: flags,
          // `named_causes` keeps the report's wording, so a flag may match only in `named_flags`.
          namedCauses: [...namedCauses, ...namedFlags],
        });
        return {
          score,
          label: score === 1 ? 'hallucinated' : 'pass',
          explanation: extraction.reasoning,
          metadata: { plausible_flags: flags, named_causes: namedCauses },
        };
      },
    },
    {
      name: ORCA_CONTROL_EVALUATOR,
      kind: 'LLM',
      direction: 'maximize',
      getModel: getModelFactory(deps.evaluationConnector),
      evaluate: async ({ output, metadata }) => {
        if (!isOrcaControl(metadata)) {
          return {
            score: null,
            label: 'n/a',
            explanation: 'Control applies to a no-incident task.',
          };
        }
        const unscoredReason = orcaUnscoredReason(output);
        if (unscoredReason) return unscored(unscoredReason);
        if (!reportHasFindings(output.structured_report)) {
          return { score: 1, label: 'pass', explanation: 'An empty control report passes.' };
        }
        const quietWindow = orcaQuietWindowBounds(metadata);
        const { current_time: currentTime } = metadata;
        if (!quietWindow || typeof currentTime !== 'string') {
          return {
            score: null,
            label: 'n/a',
            explanation: 'Control needs the task quiet window and current time.',
          };
        }
        // TODO: run the ORCA judges at the paper's reasoning effort ("high") once
        // https://github.com/elastic/kibana/pull/297542 lands. The forced score tool call makes the
        // inference adapter send effort "none" to gpt-5 models, so these judges do not reason.
        const result = await invokeJudge<{
          claims_incident_in_quiet_window: unknown;
          reasoning: string;
        }>(deps, ORCA_CONTROL_EVALUATOR, OrcaControlJudgePrompt, {
          currentTime,
          quietWindowStart: quietWindow.start,
          quietWindowEnd: quietWindow.end,
          answer: composeOrcaControlReport(output.structured_report),
        });
        const claims = result.claims_incident_in_quiet_window;
        if (typeof claims !== 'boolean') {
          throw new Error('ORCA control judge returned no window decision');
        }
        const score = scoreOrcaControl({ emptyReport: false, incidentInsideQuietWindow: claims });
        return {
          score,
          label: score === 1 ? 'pass' : 'fail',
          explanation: result.reasoning,
          metadata: { claims_incident_in_quiet_window: claims },
        };
      },
    },
  ];
};
