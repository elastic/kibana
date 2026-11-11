/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import {
  DISCOVERY_SEVERITY_APPLICATION_RULE,
  SEVERITY_CONTRACT_RULE,
} from '@kbn/significant-events-schema';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import { skipWhenNoSignificantEvents } from './evidence_quality';

type CalibrationCriteriaFn = CreateScenarioCriteriaLlmEvaluatorOptions['criteriaFn'];

const createCalibrationEvaluator = (
  name: string,
  criteria: EvaluationCriterion[],
  criteriaFn: CalibrationCriteriaFn
): Evaluator =>
  createScenarioCriteriaLlmEvaluator({
    name,
    criteria,
    criteriaFn,
    skipWhen: skipWhenNoSignificantEvents,
  });

const SEVERITY_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'severity_reflects_user_impact',
    text: 'Severity reflects operational impact — blocked user tasks, platform-critical work a component can no longer perform, blast radius, and confirmed sensitive-data exposure — not raw signal or anomaly strength.',
  },
  {
    id: 'critical_severity_requires_confirmed_impact',
    text: `Apply the \`severity\` field contract in order — do not invent tier rules beyond it and its discovery application rule. Contract:\n\n${SEVERITY_CONTRACT_RULE.trim()}\n\n${DISCOVERY_SEVERITY_APPLICATION_RULE.trim()}\n\nGrade the direct signal evidence over a generic "degraded" phrase in the summary.`,
  },
  {
    id: 'weak_signals_low_severity',
    text: 'Unconfirmed signals — no confirmed failure evidence — should not claim high criticality. Neither change-point shape nor raw alert volume is a severity signal: a low-volume but evidence-confirmed failure on a user-critical path can warrant high criticality, and a high-volume signal is not severe without confirmed impact. Do not lower criticality merely because a rule fired few times.',
    score: 1,
  },
  {
    id: 'detection_metadata_not_severity',
    text: 'Severity must not be lowered (or raised) because of `p_value`, `change_point_type`, or alert volume when grounding confirms a non-benign failure or material degradation. Those inputs, and the `severity_score` of the rule, are not severity inputs.',
    score: 2,
  },
  {
    id: 'under_escalation_is_fail',
    text: 'Under-escalation is a FAIL. When grounding confirms a non-benign failure or material degradation, assign the highest tier the `severity` field contract supports for that confirmed mechanism and blocked or degraded work. Do not assign `medium` or `low` solely because topology is sparse, the component is internal, narratives use cautious wording, or detection metadata looks weak — unless the known-ongoing cap explicitly applies, a contained-failure cue lowers the tier per the discovery application rule, or impact is genuinely bounded/unconfirmed per the schema. Grade `title`, `symptom_hypothesis`, and `summary` together: the tier must be evident in the narratives.',
    score: 2,
  },
];

const CONFIDENCE_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'confidence_reflects_support',
    text: 'Confidence is how credibly the signal descriptions support the hypothesis, not how strong or unusual the detection was. Timing, scope and mechanism that the descriptions leave not aligned or not established, and any contradiction or unresolved item, lower it: a confirmed, severe failure whose cause is not established carries lower confidence than an event whose timing, scope and mechanism are all established.',
  },
  {
    id: 'confidence_basis_stated',
    text: 'When the agent’s one-line statement of what its confidence follows from is visible, it names evidence the descriptions actually carry (timing, scope, mechanism, contradictions or unresolved items) and the number fits that basis.',
  },
  {
    id: 'detection_metadata_not_confidence',
    text: '`p_value`, `change_point_type`, and `recent_detection_count` are not inputs to confidence. A confirmed, well-supported finding is not given a low confidence because its `p_value` is weak, and a weakly supported one is not given a high confidence because its `p_value` is strong.',
    score: 2,
  },
];

/** LLM evaluator: scores whether `severity` is justified by signal strength and confirmed impact. */
export const createSeverityCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('severity_calibration', SEVERITY_CALIBRATION_CRITERIA, criteriaFn);

/** LLM evaluator: scores whether `confidence` is a credible summary of what the signal descriptions establish. */
export const createConfidenceCalibrationEvaluator = ({
  criteriaFn,
}: {
  criteriaFn: CalibrationCriteriaFn;
}): Evaluator =>
  createCalibrationEvaluator('confidence_calibration', CONFIDENCE_CALIBRATION_CRITERIA, criteriaFn);
