/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AccessedDecisionTree,
  InvestigationExample,
  InvestigationReport,
  InvestigationTaskOutput,
  TrajectoryStep,
} from '../types';

/**
 * Deductive's goal judge scores 1-5 and treats >= 4 as a pass (see
 * `GoldenGoalEvaluationResult` in `llm_tasks/golden_goal_evaluation.py`, commit 7d0cc81).
 * The LangSmith `goal_pass` feedback stores `score_normalized = (score - 1) / 4`, which the
 * scaffolding optimizer reads back as the dominant fitness term.
 */
export const GOAL_SCORE_MIN = 1;
export const GOAL_SCORE_MAX = 5;
export const GOAL_PASS_THRESHOLD = 4;

/** Clamp a raw 1-5 goal score into range, mirroring the deductive judge's validator. */
export const clampGoalScore = (raw: number): number => {
  if (!Number.isFinite(raw)) return GOAL_SCORE_MIN;
  return Math.max(GOAL_SCORE_MIN, Math.min(GOAL_SCORE_MAX, Math.round(raw)));
};

/** Map a raw 1-5 goal score to the deductive `score_normalized` value in [0, 1]. */
export const normalizeGoalScore = (raw: number): number =>
  (clampGoalScore(raw) - GOAL_SCORE_MIN) / (GOAL_SCORE_MAX - GOAL_SCORE_MIN);

/** A raw 1-5 goal score passes when it is at least 4, matching `goal_achieved`. */
export const goalScorePassed = (raw: number): boolean => clampGoalScore(raw) >= GOAL_PASS_THRESHOLD;

/**
 * The truthfulness (evidence-groundedness) judge scores 1-5: how well CLEAR, concrete evidence in
 * the investigation's own report supports its stated root cause (1 = conclusion asserted with no
 * supporting evidence, 5 = the stated root cause is directly backed by specific evidence). Like the
 * goal judge, the normalized feedback value is `(score - 1) / 4` so it lands in [0, 1].
 */
export const TRUTHFULNESS_SCORE_MIN = 1;
export const TRUTHFULNESS_SCORE_MAX = 5;

/** Clamp a raw 1-5 truthfulness score into range, rounding fractional model output. */
export const clampTruthfulnessScore = (raw: number): number => {
  if (!Number.isFinite(raw)) return TRUTHFULNESS_SCORE_MIN;
  return Math.max(TRUTHFULNESS_SCORE_MIN, Math.min(TRUTHFULNESS_SCORE_MAX, Math.round(raw)));
};

/** Map a raw 1-5 truthfulness score to a normalized value in [0, 1]. */
export const normalizeTruthfulnessScore = (raw: number): number =>
  (clampTruthfulnessScore(raw) - TRUTHFULNESS_SCORE_MIN) /
  (TRUTHFULNESS_SCORE_MAX - TRUTHFULNESS_SCORE_MIN);

/**
 * The decision-tree-helpfulness judge scores 1-5: whether the decision tree(s) (curated symptom
 * playbooks) the agent opened actually shaped its investigation, and how. Same 1-5 -> [0, 1]
 * normalization as the other reward-style judges above.
 */
export const DECISION_TREE_HELPFULNESS_SCORE_MIN = 1;
export const DECISION_TREE_HELPFULNESS_SCORE_MAX = 5;

/** Clamp a raw 1-5 decision-tree-helpfulness score into range, rounding fractional output. */
export const clampDecisionTreeHelpfulnessScore = (raw: number): number => {
  if (!Number.isFinite(raw)) return DECISION_TREE_HELPFULNESS_SCORE_MIN;
  return Math.max(
    DECISION_TREE_HELPFULNESS_SCORE_MIN,
    Math.min(DECISION_TREE_HELPFULNESS_SCORE_MAX, Math.round(raw))
  );
};

/** Map a raw 1-5 decision-tree-helpfulness score to a normalized value in [0, 1]. */
export const normalizeDecisionTreeHelpfulnessScore = (raw: number): number =>
  (clampDecisionTreeHelpfulnessScore(raw) - DECISION_TREE_HELPFULNESS_SCORE_MIN) /
  (DECISION_TREE_HELPFULNESS_SCORE_MAX - DECISION_TREE_HELPFULNESS_SCORE_MIN);

/** Clamp an already-normalized [0, 1] judge score, tolerating out-of-range model output. */
export const clampUnitScore = (raw: number): number => {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(1, raw));
};

const REFERENCE_KEYS = ['reference_answer', 'answer', 'ground_truth', 'response'] as const;

/**
 * The reference (ground-truth) answer for an example. Real customer0 datasets store it under
 * `output.reference_answer`; the remaining keys mirror the fallbacks deductive's harness reads
 * (`_safe_get(example.outputs, "answer", "reference_answer", "ground_truth")`).
 */
export const extractReferenceAnswer = (
  expected: InvestigationExample['output']
): string | undefined => {
  if (!expected) return undefined;
  for (const key of REFERENCE_KEYS) {
    const value = expected[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
};

/**
 * Compose the candidate "final answer" text the judges score, from what the investigation
 * recorded. Deductive judges read a single `final_answer` string; the investigation agent instead
 * records a verdict (the root-cause narrative, `conclusion` here), so we lead with it and append
 * the summary of what happened and the confirmed/likely hypotheses.
 */
export const composeAnswerText = (report: InvestigationReport | undefined): string => {
  if (!report) return '';
  const parts: string[] = [];
  if (report.conclusion) parts.push(`Conclusion: ${report.conclusion}`);
  if (report.summary) parts.push(`Summary: ${report.summary}`);
  if (report.severity) parts.push(`Severity: ${report.severity}`);
  const hypotheses = report.hypotheses ?? [];
  if (hypotheses.length > 0) {
    const rendered = hypotheses
      .slice()
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .map((hypothesis) => {
        const confidence = Math.round((hypothesis.confidence ?? 0) * 100);
        const reason = hypothesis.reason ? ` — ${hypothesis.reason}` : '';
        return `- [${hypothesis.status}, ${confidence}% confidence] ${hypothesis.candidate}${reason}`;
      })
      .join('\n');
    parts.push(`Hypotheses:\n${rendered}`);
  }
  return parts.join('\n\n');
};

/**
 * Compose the report's own evidence text, per-hypothesis evidence tagged with that hypothesis's
 * candidate and status so a judge cannot attribute a rejected/secondary hypothesis's evidence to
 * the primary conclusion, plus the impact evidence and the actions the agent proposed. This is the
 * model's own *selected* evidence, not what it actually accessed — see `composeTrajectoryText`.
 * Evidence descriptions carry the ES|QL the agent ran; chart points are left out.
 */
export const composeEvidenceText = (report: InvestigationReport | undefined): string => {
  if (!report) return '';
  const lines: string[] = [];
  for (const hypothesis of report.hypotheses ?? []) {
    for (const evidence of hypothesis.evidence ?? []) {
      const chart = evidence.chart ? ` [chart: ${evidence.chart.title}]` : '';
      lines.push(
        `- [${hypothesis.status}] ${hypothesis.candidate}: ${evidence.description ?? ''}${chart}`
      );
    }
  }
  if (report.impact?.summary) {
    lines.push(`- impact: ${report.impact.summary}`);
  }
  for (const proposal of report.proposals ?? []) {
    lines.push(`- proposed action: ${proposal.title}`);
  }
  return lines.join('\n');
};

/**
 * Render the investigation's actual tool-call trajectory: what it called, with what arguments,
 * and what came back, in order. Unlike `composeEvidenceText` (the model's own selected evidence),
 * this is the real accessed history, so judges that must verify what the agent actually saw —
 * rca_anti_leakage, truthfulness, decision_tree_helpfulness — use this instead.
 */
export const composeTrajectoryText = (trajectory: TrajectoryStep[] | undefined): string => {
  if (!trajectory || trajectory.length === 0) return '';
  return trajectory
    .map(
      ({ tool_id: toolId, params, result }, index) =>
        `${index + 1}. ${toolId}(${JSON.stringify(params)})\n   → ${result}`
    )
    .join('\n');
};

/**
 * Render the decision tree(s) (symptom playbooks) the agent opened for the judge. A tree opened
 * without readable content (e.g. a read that errored) still surfaces the tree id.
 */
export const composeDecisionTreesText = (trees: AccessedDecisionTree[] | undefined): string => {
  if (!trees || trees.length === 0) return '';
  return trees
    .map(({ tree_id: treeId, content }) =>
      content
        ? `### ${treeId}\n${content}`
        : `### ${treeId}\n(opened, no readable content captured)`
    )
    .join('\n\n');
};

/** Everything a judge needs about one investigation run, derived once and shared. */
export interface JudgeInputs {
  question: string;
  reference?: string;
  answer: string;
  /** The report's own selected evidence, tagged by hypothesis. */
  evidence: string;
  /** The actual tool-call trajectory: what the agent really accessed, in order. */
  trajectory: string;
  category?: string;
  executionError?: string;
  decisionTrees: string;
  hasDecisionTrees: boolean;
}

export const buildJudgeInputs = (
  input: InvestigationExample['input'],
  output: InvestigationTaskOutput,
  expected: InvestigationExample['output'],
  metadata: InvestigationExample['metadata']
): JudgeInputs => ({
  question: output.query || (typeof input?.question === 'string' ? input.question : ''),
  reference: extractReferenceAnswer(expected),
  answer: composeAnswerText(output.structured_report),
  evidence: composeEvidenceText(output.structured_report),
  trajectory: composeTrajectoryText(output.tool_call_trajectory),
  category: typeof metadata?.category === 'string' ? metadata.category : undefined,
  executionError: output.execution_error,
  decisionTrees: composeDecisionTreesText(output.decision_trees_accessed),
  hasDecisionTrees: Boolean(output.decision_trees_accessed?.length),
});
