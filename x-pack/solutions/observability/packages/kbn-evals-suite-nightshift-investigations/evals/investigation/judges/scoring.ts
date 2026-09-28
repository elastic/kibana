/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStructuredOutput } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';

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

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * Compose the candidate "final answer" text the judges score, from the persisted structured
 * report. Deductive judges read a single `final_answer` string; the investigation agent instead
 * emits a structured report whose `conclusion` is the root-cause narrative, so we lead with it and
 * append the supporting summary and confirmed/likely hypotheses.
 */
export const composeAnswerText = (report: InvestigationStructuredOutput | undefined): string => {
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
      .slice(0, 10)
      .map((hypothesis) => {
        const confidence = Math.round((hypothesis.confidence ?? 0) * 100);
        const reason = hypothesis.reason ? ` — ${hypothesis.reason}` : '';
        return `- [${hypothesis.status}, ${confidence}% confidence] ${hypothesis.candidate}${reason}`;
      })
      .join('\n');
    parts.push(`Hypotheses:\n${rendered}`);
  }
  return truncate(parts.join('\n\n'), 8000);
};

/**
 * Compose an evidence/trajectory-style text from the structured report. Deductive judges also see a
 * truncated tool-call trajectory; the closest persisted analogue is the evidence attached to each
 * hypothesis, plus the recommendations the agent derived.
 */
export const composeEvidenceText = (report: InvestigationStructuredOutput | undefined): string => {
  if (!report) return '';
  const lines: string[] = [];
  for (const hypothesis of report.hypotheses ?? []) {
    for (const evidence of hypothesis.evidence ?? []) {
      const query = evidence.esql_query ? ` [esql: ${truncate(evidence.esql_query, 200)}]` : '';
      lines.push(`- ${evidence.description}${query}`);
    }
  }
  for (const recommendation of report.recommendations ?? []) {
    lines.push(`- recommendation: ${recommendation.title}`);
  }
  return truncate(lines.join('\n'), 6000);
};

/**
 * Fast rule-based leakage pre-check, ported from `rca_anti_leakage_feedback` (commit 7d0cc81).
 * Flags post-incident resolution language that must not be used as primary causal evidence at
 * investigation time; a match escalates to the LLM confirmation call.
 */
const LEAKAGE_PATTERN =
  /\b(incident\s+resolved|post[- ]incident|mitigation\s+completed|rollback\s+completed|rollback\s+fixed|resolution|resolved\s+at|pev[- ]\d+.*(?:resolved|mitigated|fixed))\b/i;

export const hasLeakageIndicators = (text: string): boolean => LEAKAGE_PATTERN.test(text);

/** Everything a judge needs about one investigation run, derived once and shared. */
export interface JudgeInputs {
  question: string;
  reference?: string;
  answer: string;
  evidence: string;
  category?: string;
  executionError?: string;
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
  category: typeof metadata?.category === 'string' ? metadata.category : undefined,
  executionError: output.execution_error,
});
