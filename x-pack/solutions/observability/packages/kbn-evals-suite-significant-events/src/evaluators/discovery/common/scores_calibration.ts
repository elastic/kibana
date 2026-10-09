/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';

type CalibrationCriteriaFn = CreateScenarioCriteriaLlmEvaluatorOptions['criteriaFn'];

const createCalibrationEvaluator = (
  name: string,
  criteria: EvaluationCriterion[],
  criteriaFn: CalibrationCriteriaFn
): Evaluator => createScenarioCriteriaLlmEvaluator({ name, criteria, criteriaFn });

/**
 * Severity is computed from `effect`/`outage_paths`, not written by the
 * agent — `severityExactEvaluator` (CODE) already grades the resulting
 * tier against the stored documents. This judge grades the one thing code cannot verify without
 * a ground-truth label: whether the agent read those typed facts correctly off the grounding
 * evidence. Each criterion is a model-supplied input to the deterministic policy; a FAIL here is
 * the policy being fed a wrong fact, which no amount of determinism downstream can correct.
 */
const EFFECT_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'effect_reflects_evidenced_failure_mode',
    text: "effect classifies the requested operation's own terminal outcome — success, degraded success, or failure — never the surface form of what the row logged (a status code, an exception name, a component along the path erroring) and never how many callers were affected. Any error, at any layer (the operation's own reply or an internal dependency it calls through), is evidence to weigh, not a verdict to inherit: a FAIL is treating such an error as automatic proof the operation failed when the row (or a known fallback) shows it still completed, and equally a FAIL is deflating a row that plainly shows the operation failed to \"degradation\" or \"none\". Whose fault a failure is does not change whether it is one — that question belongs in symptom_hypothesis, never in effect. When the row genuinely does not establish the terminal outcome either way, the matched query KI's description may have broken the tie — adversarially verify the signal's own description cites a specific clause the row plausibly shows, not that the agent merely inherited the KI description's wording as if it were observed; a row that plainly shows success or failure on its own does not qualify for this tie-break regardless of what the KI description says.",
  },
  {
    id: 'effect_requires_confirming_verdict',
    text: 'effect is "none" on every signal whose verdict is refutes, inconclusive, or not_checked, and on an off_topic signal with no concrete observed error. Only a confirms signal, or an off_topic signal with a concrete non-benign error, may classify as degradation/outage/exposure.',
    score: 2,
  },
  {
    id: 'outage_paths_named_correctly',
    text: 'When effect is "outage", outage_paths lists one entry per distinct verified path the row shows failing to complete, each named from what the evidence actually shows (the caller operation when named, otherwise the failing source -> target hop) — not inferred, not generic, not a bare URL, and not one path split into near-duplicates by endpoint variant or status code. A FAIL here is listing fewer or more distinct paths than the row evidences.',
  },
  {
    id: 'exposure_requires_confirmed_exposure',
    text: 'effect is "exposure" only on confirmed active exposure of PII, PCI DSS, SSN, credentials, secrets, or tokens evidenced by the row — never for a general data-access finding, and never inferred from the rule name alone.',
    score: 2,
  },
];

const CONFIDENCE_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'confidence_reflects_support',
    text: 'Confidence reflects how well-supported the assessment is — KI backing, number of confirmed evidences, and corroboration — not the raw anomaly strength.',
  },
  {
    id: 'no_ki_caps_confidence',
    text: 'Failure findings with no KI match and no active failure evidence should not claim high confidence (kept at or below ~0.65 without KI backing). Exception: `refutes` discoveries — where queries returned healthy rows (`evidence.result: "found"` with a healthy signature) confirming the signal is a non-event — are confirmed non-events, not unconfirmed findings, so they may sit in the 0.65–0.75 range without KI backing and are exempt from this cap. `off_topic`, `inconclusive`, and `not_checked` findings are not exempt.',
  },
  {
    id: 'strong_corroboration_high_confidence',
    text: 'Only strongly corroborated findings (multiple confirmed evidences plus aligned KI backing from the input topology or this cycle’s KI search, with no contradiction) may claim high confidence (>=0.85). The judge need not repeat KI search when the discovery already carries aligned causal_features or blast_radius.',
  },
];

/** LLM evaluator: scores whether `confidence` reflects evidence/KI backing, with the no-KI ceiling. */
export const createConfidenceCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('confidence_calibration', CONFIDENCE_CALIBRATION_CRITERIA, criteriaFn);

/** LLM evaluator: scores whether each signal's effect/outage_paths match its evidence row. */
export const createEffectCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('effect_calibration', EFFECT_CALIBRATION_CRITERIA, criteriaFn);
