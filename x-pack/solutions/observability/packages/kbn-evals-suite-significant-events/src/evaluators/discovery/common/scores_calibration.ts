/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import {
  CONFIDENCE_CONTRACT_RULE,
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
    text: `Apply the \`severity\` field contract in order — do not invent tier rules beyond it and its discovery application rule. Contract:\n\n${SEVERITY_CONTRACT_RULE.trim()}\n\n${DISCOVERY_SEVERITY_APPLICATION_RULE.trim()}\n\nGrade the direct signal evidence over a generic "degraded" phrase in the summary. A tier needs the evidence these rules name: a count or share of log lines is volume, not impact.`,
  },
  {
    id: 'weak_signals_low_severity',
    text: 'Unconfirmed signals — no confirmed failure evidence — should not claim high criticality. Neither change-point shape nor raw alert volume is a severity signal: a high volume of log lines is not impact by itself. A rule that fired few times is not lowered for that alone, and a failure confirmed on a user-critical path is rated on the evidence the severity rules name for its tier, not on how many detections fired.',
    score: 1,
  },
  {
    id: 'detection_metadata_not_severity',
    text: 'Severity must not be lowered (or raised) because of `p_value`, `change_point_type`, or alert volume when grounding confirms a non-benign failure or material degradation. Those inputs, and the `severity_score` of the rule, are not severity inputs.',
    score: 2,
  },
  {
    id: 'under_escalation_is_fail',
    text: 'Under-escalation is a FAIL: the descriptions support a higher tier under the severity rules above and the event is rated lower. Sparse topology, an internal component, cautious narrative wording or weak detection metadata are not reasons to rate lower. Grade `title`, `symptom_hypothesis`, and `summary` together: the tier must be evident in the narratives.',
    score: 2,
  },
  {
    id: 'over_escalation_is_fail',
    text: 'Over-escalation is a FAIL: the event is rated higher than the severity rules above support.',
    score: 2,
  },
];

const CONFIDENCE_CALIBRATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'confidence_reflects_support',
    text: `Confidence follows the confidence contract:\n\n${CONFIDENCE_CONTRACT_RULE.trim()}\n\nGrade whether the number fits the evidence the descriptions carry.`,
  },
  {
    id: 'confidence_basis_stated',
    text: 'Sentence 3 of the assessment_note names evidence the descriptions actually carry (the failure, its timing and scope, contradictions between signals) and any support they do not show, and the confidence fits that basis.',
  },
  {
    id: 'detection_metadata_not_confidence',
    text: '`p_value`, `change_point_type`, and `recent_detection_count` are not inputs to confidence. A confirmed, well-supported finding is not given a low confidence score because its `p_value` is weak, and a weakly supported one is not given a high confidence score because its `p_value` is strong.',
    score: 2,
  },
  {
    id: 'kb_gap_not_a_penalty',
    text: 'A missing knowledge-base edge, an empty `blast_radius` or a knowledge gap (a service or call target the rows name that no knowledge record covers) never lowers confidence, and lowers severity only where the severity rules say so. The rows outrank the knowledge base; the note records the gap as unverified in sentence 2.',
    score: 2,
  },
  {
    id: 'hypothesis_explains_only_whats_supported',
    text: 'The symptom hypothesis explains only as far as the evidence supports: it names no cause beyond a failing component or dependency the rows or a topology edge show, says at most in one clause that a cause is not established, and keeps longer unknowns and disclaimers in the assessment note.',
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
