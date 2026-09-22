/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import { SEVERITY_CONTRACT_RULE } from '@kbn/significant-events-schema';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';

type CalibrationCriteriaFn = CreateScenarioCriteriaLlmEvaluatorOptions['criteriaFn'];

const createCalibrationEvaluator = (
  name: string,
  criteria: EvaluationCriterion[],
  criteriaFn: CalibrationCriteriaFn
): Evaluator => createScenarioCriteriaLlmEvaluator({ name, criteria, criteriaFn });

const SEVERITY_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'severity_reflects_user_impact',
    text: 'Severity reflects operational impact — blocked user tasks, platform-critical work a component can no longer perform, blast radius, and confirmed sensitive-data exposure — not raw signal or anomaly strength.',
  },
  {
    id: 'critical_severity_requires_confirmed_impact',
    text: `Apply the \`severity\` field contract in order — do not invent alternate tier rules. Contract:\n\n${SEVERITY_CONTRACT_RULE.trim()}\n\nGrade the direct signal evidence over a generic "degraded" phrase in the summary.`,
  },
  {
    id: 'weak_signals_low_severity',
    text: 'Unconfirmed signals — no confirmed failure evidence AND not statistically credible (high p_value) — should not claim high criticality. Neither change-point shape nor raw alert volume is a severity signal: a low-volume but evidence-confirmed failure on a user-critical path can warrant high criticality, and a high-volume signal is not severe without confirmed impact. Do not lower criticality merely because a rule fired few times.',
    score: 1,
  },
  {
    id: 'detection_metadata_not_severity',
    text: 'Severity must not be lowered (or raised) because of `p_value`, `change_point_type`, or alert volume when grounding confirms a non-benign failure or material degradation. Those inputs may affect `confidence` only. Rule `severity_score` may support a higher applicable tier when grounding confirms a matching failure class, but cannot override absent or contradictory grounding.',
    score: 2,
  },
  {
    id: 'under_escalation_is_fail',
    text: 'Under-escalation is a FAIL. When grounding confirms a non-benign failure or material degradation, assign the highest tier the `severity` field contract supports for that confirmed mechanism and blocked or degraded work. Do not assign `40-medium` or `20-low` solely because topology is sparse, the component is internal, narratives use cautious wording, or detection metadata looks weak — unless the known-ongoing cap explicitly applies or impact is genuinely bounded/unconfirmed per the schema. Grade `title`, `symptom_hypothesis`, and `summary` together: the tier must be evident in the narratives.',
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

/** LLM evaluator: scores whether `severity` is justified by signal strength and confirmed impact. */
export const createSeverityCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('severity_calibration', SEVERITY_CALIBRATION_CRITERIA, criteriaFn);

/** LLM evaluator: scores whether `confidence` reflects evidence/KI backing, with the no-KI ceiling. */
export const createConfidenceCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('confidence_calibration', CONFIDENCE_CALIBRATION_CRITERIA, criteriaFn);
