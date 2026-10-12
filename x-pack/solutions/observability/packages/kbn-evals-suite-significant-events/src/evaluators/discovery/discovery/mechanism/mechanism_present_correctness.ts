/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { DiscoveryEvaluationExample, DiscoveryAgentOutput } from '../../types';

/**
 * Whether the mechanism is present is the discovery agent's only gate on writing an event, mirrored
 * from its instructions. Status is not an agent decision: every event it writes is `active`, and the
 * engine moves events to `recovering` and `inactive`. Severity is graded separately.
 */
const MECHANISM_PRESENT_RUBRIC = [
  'Grade whether the agent wrote an event for each candidate whose mechanism is present, and no event for any other. Do not grade status (every written event is active; the engine owns recovery) or severity (graded separately).',
  'You cannot run queries. Use the signal counts in the summary and the agent output evidence.',
  '',
  'Mechanism present, so an event is expected: a current failure, material degradation, or sensitive-data exposure has a `confirms` verdict. A concrete non-benign error in a found `off_topic` row directly confirms a separate observed-error event; judge that event from the row’s error signature and impact.',
  'Mechanism absent, so NO event is expected: the candidate is a false alarm, a benign/positive change, an unrelated finding, or non-confirming (`confirmsVerdictCount == 0`) with no concrete non-benign error in an off-topic row. An event written for it is a FAIL, and so is an event written only because recovery evidence (healthy/opposite rows, an empty exact query) was found for an existing event.',
  '',
  'Hard constraints: a matching healthy or positive row is verified but does not confirm an incident, so it produces no event. The observed-error exception applies only to a concrete non-benign error, not healthy, ambiguous, or merely unrelated rows. A `dip` alone establishes nothing.',
].join('\n');

/**
 * LLM evaluator: grades whether an event was written exactly for the candidates whose mechanism is
 * present. Severity is graded by the dedicated evaluators.
 */
export const createMechanismPresentCorrectnessEvaluator = (
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator
): Evaluator<DiscoveryEvaluationExample, DiscoveryAgentOutput> => ({
  name: 'mechanism_present_correctness',
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async (params) => {
    const { output, expected } = params;
    const expectedGroundTruth = expected?.expected_ground_truth;

    if (!expectedGroundTruth) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'expected_ground_truth not specified — skipping mechanism-present check',
      };
    }

    const events = output?.significantEvents ?? [];
    const eventsSummary = events.map((e) => ({
      event_id: e.event_id,
      confirmsVerdictCount: (e.signals ?? []).filter((s) => s.verdict === 'confirms').length,
      refutesVerdictCount: (e.signals ?? []).filter((s) => s.verdict === 'refutes').length,
      offTopicVerdictCount: (e.signals ?? []).filter((s) => s.verdict === 'off_topic').length,
      unresolvedVerdictCount: (e.signals ?? []).filter(
        (s) => s.verdict === 'inconclusive' || s.verdict === 'not_checked'
      ).length,
    }));

    const criteria: EvaluationCriterion[] = [
      {
        id: 'mechanism_present_correctness',
        score: 1,
        text:
          `${MECHANISM_PRESENT_RUBRIC}\n\n` +
          `Expected outcome: ${expectedGroundTruth}. ` +
          `The discovery agent returned: ${JSON.stringify(eventsSummary)}. ` +
          `PASS only if an event was written for exactly the candidates the expected outcome says are present (match by title/content, not by exact event_id) AND each written event is justified by its ` +
          `signals and the gates above. Ignore status and severity in this evaluator. A missing event, an extra event, or a constraint violation is a FAIL even if it is "close".`,
      },
    ];

    return criteriaFn(criteria).evaluate({
      ...params,
      output,
    });
  },
});
