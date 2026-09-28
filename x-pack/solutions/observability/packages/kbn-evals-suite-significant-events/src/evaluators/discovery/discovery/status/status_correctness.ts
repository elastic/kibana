/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { DiscoveryEvaluationExample, DiscoveryAgentOutput } from '../../types';

/** Status decision gates, mirrored from the discovery agent instructions. Severity is graded separately. */
const STATUS_DECISION_RUBRIC = [
  "Grade whether the agent's `status` for each event is correct given the gates below. Do not grade severity; the severity-calibration evaluator owns that decision.",
  'You cannot run queries. Use the signal counts in the summary and the agent output evidence.',
  '',
  'Status gates:',
  '- `open`: a current failure, material degradation, or sensitive-data exposure has a `confirms` verdict, or an `inconclusive` verdict leaves one plausible, or a `not_checked` verdict leaves one plausible only when evidence shows no backed query was available. A concrete non-benign error in a found `off_topic` row directly confirms a separate observed-error event; judge that event from the row’s error signature and impact.',
  '- `dismissed`: the proposed incident is a false alarm, benign/positive change, unrelated finding, or non-confirming finding (`confirmsVerdictCount == 0`), with no plausible failure, degradation, or exposure left unresolved. A concrete non-benign error found in an off-topic row is independent current evidence: reject the original rule, but represent the observed error with an `open` event rather than dismissing it.',
  '- `closed` is a recovery state, not the disposition for a healthy or positive predicate. For an active or ambiguous failure shape it requires recovery-lens grounding with verified healthy/opposite rows or a successfully executed exact query with no matching failure rows.',
  '- An open event with the same rule may be reconciled to `closed` even when its prior signal is unconfirmed, if a current exact query shows verified healthy/opposite rows or no matching failure rows. This exception applies to directionally ambiguous detections, preserves the existing episode, and does not create a new dismissed event.',
  '- `closed` for a settled episode requires every signal to be settled/downward or to satisfy the same-rule recovery reconciliation exception. Carried settled signals are trusted; each fresh settled signal requires recovery-lens grounding with verified healthy/opposite rows or a successfully executed exact query with no matching failure rows. A query error, telemetry gap, unrelated result, or active failure row blocks closure.',
  '',
  'Hard constraints: a matching healthy or positive row is verified but does not confirm an incident; mark it rejected and dismiss when no failure, degradation, or exposure remains. The observed-error exception applies only to a concrete non-benign error, not healthy, ambiguous, or merely unrelated rows. A successful empty recovery-lens query can support closure; a query error or telemetry gap cannot. A `dip` alone establishes neither active failure nor recovery.',
].join('\n');

/**
 * LLM evaluator: grades whether `status` matches the IC decision gates.
 * Severity is graded by the dedicated severity-calibration evaluator.
 */
export const createStatusCorrectnessEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<DiscoveryEvaluationExample, DiscoveryAgentOutput> => ({
  name: 'status_correctness',
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async (params) => {
    const { output, expected } = params;
    const expectedGroundTruth = expected?.expected_ground_truth;

    if (!expectedGroundTruth) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'expected_ground_truth not specified — skipping status correctness check',
      };
    }

    const events = output?.significantEvents ?? [];
    const eventsSummary = events.map((e) => ({
      event_id: e.event_id,
      status: e.status,
      confirmsVerdictCount: (e.signals ?? []).filter((s) => s.verdict === 'confirms').length,
      refutesVerdictCount: (e.signals ?? []).filter((s) => s.verdict === 'refutes').length,
      offTopicVerdictCount: (e.signals ?? []).filter((s) => s.verdict === 'off_topic').length,
      unresolvedVerdictCount: (e.signals ?? []).filter(
        (s) => s.verdict === 'inconclusive' || s.verdict === 'not_checked'
      ).length,
    }));

    const criteria: EvaluationCriterion[] = [
      {
        id: 'status_correctness',
        score: 1,
        text:
          `${STATUS_DECISION_RUBRIC}\n\n` +
          `Expected outcome: ${expectedGroundTruth}. ` +
          `The discovery agent returned: ${JSON.stringify(eventsSummary)}. ` +
          `PASS only if each event's returned status matches the expected outcome (match by title/content, not by exact event_id) AND is justified by the event's ` +
          `signals and the gates above. Ignore severity in this evaluator. A status or constraint violation is a FAIL even if it is "close".`,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output,
    });
  },
});
