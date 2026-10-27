/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';
import {
  ASSESSMENT_NOTE_ROLE_RULE,
  NARRATIVE_AGREEMENT_RULE,
  NO_RAW_SENSITIVE_VALUES_RULE,
  SUMMARY_ROLE_RULE,
  SYMPTOM_HYPOTHESIS_ROLE_RULE,
} from '@kbn/significant-events-schema';
import {
  createScenarioCriteriaLlmEvaluator,
  type CreateScenarioCriteriaLlmEvaluatorOptions,
} from '../../scenario_criteria/evaluators';

const EVIDENCE_DESCRIPTION_SHARED_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'evidence_description_no_payload',
    text: `No signal description violates the sensitive-values rule the agent is given: ${NO_RAW_SENSITIVE_VALUES_RULE} Counts, shares, timestamps and the quoted fields that state the failure are required content of a description, not payload.`,
    score: 1,
  },
];

const EVIDENCE_DESCRIPTION_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'evidence_description_is_grounded_check',
    text: 'Every fresh signal must set `verdict` to `confirms`, `refutes`, `off_topic`, `inconclusive`, or `not_checked`. Do not repeat a Verdict label in the description or add process narration and a "Testing: … Expected: …" preamble. For `confirms`, `refutes`, and `off_topic`, the description states the observed row signature and impact. For `inconclusive`, the description states why the query could not establish a conclusion (empty, error, or ambiguous result). For `not_checked`, the description states that no query ran and why. Entries carried forward unchanged from prior cycles (older `collected_at`) are acceptable in any format. Informational entries need no structured verification account: quiet-rule signals (evidence is null) and "no confirming query available" dispositions are acceptable as written.',
    score: 1,
  },
  ...EVIDENCE_DESCRIPTION_SHARED_CRITERIA,
];

const NARRATIVE_FIELDS_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'narrative_fields_bounded_and_safe',
    text: `symptom_hypothesis, summary, and assessment_note are each at most three sentences. Judge sentence counts, not character counts: a sentence ends at a full stop, question mark or exclamation mark, so clauses joined by a comma, semicolon or "while" are one sentence. Judge only sentence counts and sensitive values here; counts, timestamps, wording and format belong to the other criteria. ${NO_RAW_SENSITIVE_VALUES_RULE}`,
    score: 1,
  },
  {
    id: 'symptom_hypothesis_mechanism',
    text: `symptom_hypothesis follows its field contract:\n${SYMPTOM_HYPOTHESIS_ROLE_RULE}\nJudge the mechanism against what this event's own signals, causal_features and blast_radius evidence. Do not require a cause, component or propagation that the evidence does not show: an evidenced failure path with no evidenced root cause meets the contract, and naming an unevidenced cause does not.`,
    score: 1,
  },
  {
    id: 'summary_observed_state',
    text: `summary follows its field contract:\n${SUMMARY_ROLE_RULE}`,
    score: 1,
  },
  {
    id: 'assessment_note_reasoning_only',
    text: `assessment_note follows its field contract:\n${ASSESSMENT_NOTE_ROLE_RULE}`,
    score: 1,
  },
  {
    id: 'narrative_fields_agree',
    text: `The event's title, symptom_hypothesis, summary, assessment_note and severity agree with each other and with the event's signal descriptions. ${NARRATIVE_AGREEMENT_RULE} Judge only agreement here: for example, a summary that states impact is confirmed while the note says completion is unresolved, a field that names an operation or path the others omit, or a tier the note's reasoning does not support. Wording, sentence counts and figures belong to the other criteria.`,
    score: 2,
  },
  {
    id: 'event_local_narrative',
    text: 'Each event narrative refers only to that event’s final signals, causal_features, and blast_radius. Do not copy a symptom_hypothesis, summary, or assessment_note from another discovery component; names, mechanisms, and impacts must match the event’s own evidence.',
    score: 1,
  },
  {
    id: 'off_topic_error_narrative_focus',
    text: 'When a concrete off-topic error creates its own event, symptom_hypothesis and summary focus on the observed error, affected operation, and bounded impact. Do not repeat the authored rule that the row refuted; keep that rule-to-row mismatch in the signal description or assessment_note.',
    score: 1,
  },
];

const SIGNAL_EVIDENCE_CONSISTENCY_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'signal_confirmation_matches_evidence',
    text: 'Use `confirms` only when a found row directly supports the rule’s failure, degradation, exposure, or evidenced cascade; a failure the system caught, retried or handled still confirms, because containment is rated in severity and not by the verdict. Use `refutes` for verified healthy, positive, or no-failure evidence; `off_topic` for unrelated found rows; `inconclusive` when a query cannot establish a conclusion; and `not_checked` when no query ran.',
    score: 1,
  },
  {
    id: 'event_decision_matches_signal_evidence',
    text: 'If no signal confirms a failure, degradation, or exposure, dismiss the event unless independent current evidence leaves one plausibly unresolved. In that case, keep it active with an explicit evidence gap. A concrete non-benign error in an off-topic found row directly confirms a separate observed-error event: keep the original rule signal `verdict: off_topic` (not `refutes`), but create or merge an `active` event grounded only in that row’s error signature and impact. The exception does not apply to healthy, ambiguous, or merely unrelated rows; evaluate the observed-error event’s severity and confidence from its direct evidence rather than the source rule’s `verdict`. Exception: close an established same-rule episode when a successful exact query has verified healthy/opposite rows or no matching failure rows, even if the detection direction is ambiguous and the prior signal was not `confirms`. Do not create a new inactive event for that recovery reconciliation. Same-rule empty/healthy authored-query evidence recovers only episodes grounded in that rule’s hypothesis; for an off-topic observed-error episode, keep it active until evidence of that error class clears (or an operator dismisses it). A query error, telemetry gap, or unrelated result blocks closure. Do not infer a root cause, impact, or severity tier from empty evidence alone.',
    score: 1,
  },
];

/**
 * Abstains for a run that wrote no event: there are no signals or narrative to judge, and the
 * missing event is already scored by the grouping, status and scenario evaluators.
 */
export const skipWhenNoSignificantEvents = (output: TaskOutput): string | undefined => {
  const events = (output as { significantEvents?: unknown[] } | null)?.significantEvents;
  return Array.isArray(events) && events.length > 0
    ? undefined
    : 'No significant event was written, so there are no signals or narrative to judge';
};

/** LLM evaluator: grades whether each signal's `description` follows the expected verification account structure. */
export const createEvidenceDescriptionEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
  skipWhen,
  criteria = EVIDENCE_DESCRIPTION_CRITERIA,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'evidence_description_quality',
    criteriaFn,
    criteria,
    transformOutput,
    skipWhen,
  });

/** LLM evaluator: grades the distinctness, safety, and operator usefulness of event narrative fields. */
export const createNarrativeFieldsEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
  skipWhen,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'narrative_fields_quality',
    criteriaFn,
    criteria: NARRATIVE_FIELDS_CRITERIA,
    transformOutput,
    skipWhen,
  });

/** LLM evaluator: grades whether signal confirmation and event decisions match grounded evidence. */
export const createSignalEvidenceConsistencyEvaluator = <
  TExample extends Example,
  TOutput extends TaskOutput
>({
  criteriaFn,
  transformOutput,
  skipWhen,
}: CreateScenarioCriteriaLlmEvaluatorOptions<TExample, TOutput>): Evaluator<TExample, TOutput> =>
  createScenarioCriteriaLlmEvaluator<TExample, TOutput>({
    name: 'signal_evidence_consistency',
    criteriaFn,
    criteria: SIGNAL_EVIDENCE_CONSISTENCY_CRITERIA,
    transformOutput,
    skipWhen,
  });
