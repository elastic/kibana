/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';
import { setPrf } from '../common/metrics';
import {
  alignExpectedEventsToActuals,
  getConfirmedDetectionRuleUuids,
} from '../common/align_events';

export interface TopologyScore {
  score: number | null;
  explanation: string;
}

/** Entries beyond the expected set that score as recall only (the calling service, a dependency). */
const MAX_UNPENALIZED_EXTRA_IDS = 2;

const topologyExpectedEvents = (
  expectedEvents: Array<Partial<SignificantEvent>>
): Array<Partial<SignificantEvent>> =>
  expectedEvents.filter(
    (event) => (event.causal_features?.length ?? 0) > 0 || (event.blast_radius?.length ?? 0) > 0
  );

const scoreIdSet = ({
  field,
  eventLabel,
  actualIds,
  expectedIds,
}: {
  field: 'causal_features' | 'blast_radius';
  eventLabel: string;
  actualIds: string[];
  expectedIds: string[];
}): { score: number; explanation?: string } => {
  const { recall, precision } = setPrf(actualIds, expectedIds);
  const extras = new Set(actualIds.filter((id) => !expectedIds.includes(id))).size;
  if (extras > MAX_UNPENALIZED_EXTRA_IDS) {
    return {
      score: Math.min(recall, precision),
      explanation: `${field}[${eventLabel}]: ${extras} entries beyond the expected set (more than ${MAX_UNPENALIZED_EXTRA_IDS} are penalized) P=${precision.toFixed(
        2
      )} R=${recall.toFixed(2)} expected=[${expectedIds.join(',')}] got=[${actualIds.join(',')}]`,
    };
  }
  if (recall >= 1) {
    return { score: recall };
  }
  const missing = expectedIds.filter((id) => !actualIds.includes(id));
  return {
    score: recall,
    explanation: `${field}[${eventLabel}]: R=${recall.toFixed(2)} missing=[${missing.join(
      ','
    )}] expected=[${expectedIds.join(',')}] got=[${actualIds.join(',')}]`,
  };
};

const scoreTopologyFields = ({
  actual,
  expected,
  eventLabel,
}: {
  actual: Partial<SignificantEvent>;
  expected: Partial<SignificantEvent>;
  eventLabel: string;
}): { score: number | null; explanations: string[] } => {
  const hasExpectedTopology =
    (expected.causal_features?.length ?? 0) > 0 || (expected.blast_radius?.length ?? 0) > 0;

  if (!hasExpectedTopology) {
    return { score: null, explanations: [] };
  }

  const explanations: string[] = [];
  const eventScores: number[] = [];

  const fields = ['causal_features', 'blast_radius'] as const;
  for (const field of fields) {
    const expectedFeatures = expected[field] ?? [];
    if (expectedFeatures.length === 0) {
      continue;
    }
    const result = scoreIdSet({
      field,
      eventLabel,
      expectedIds: expectedFeatures.map((f) => f.feature_id),
      actualIds: (actual[field] ?? []).map((f) => f.feature_id),
    });
    eventScores.push(result.score);
    if (result.explanation) {
      explanations.push(result.explanation);
    }
  }

  const score =
    eventScores.length > 0 ? eventScores.reduce((a, b) => a + b, 0) / eventScores.length : 1;

  return { score, explanations };
};

/**
 * Recall over the expected causal_features and blast_radius feature IDs: an entry the agent adds
 * beyond the expected set (for example the calling service) is not penalized, up to
 * `MAX_UNPENALIZED_EXTRA_IDS`; beyond that the score is capped by precision. The evaluator name is
 * unchanged, so runs scored as F1 before this change are not comparable.
 * Each expected event is matched to the actual event with the highest rule UUID overlap in signals.
 * Each actual event can only be claimed by one expected event (no double-counting).
 */
export const scoreTopologyCorrectness = (
  actuals: SignificantEvent[],
  expectedEvents: Array<Partial<SignificantEvent>>
): TopologyScore => {
  const topologyExpected = topologyExpectedEvents(expectedEvents);

  if (topologyExpected.length === 0) {
    return {
      score: null,
      explanation: 'No topology (causal_features or blast_radius) declared in expected events',
    };
  }

  const explanations: string[] = [];
  let totalScore = 0;

  const alignmentKeys = topologyExpected.map((exp) => ({
    event_id: exp.event_id,
    expectedRuleUuids: getConfirmedDetectionRuleUuids(exp),
  }));
  const matches = alignExpectedEventsToActuals(alignmentKeys, actuals);

  for (let i = 0; i < topologyExpected.length; i++) {
    const exp = topologyExpected[i];
    const match = matches[i];

    if (!match) {
      explanations.push(`event=${exp.event_id ?? '?'}: no matching actual event found`);
      totalScore += 0;
      continue;
    }

    const { score: eventScore, explanations: fieldExplanations } = scoreTopologyFields({
      actual: match,
      expected: exp,
      eventLabel: exp.event_id ?? '?',
    });
    if (eventScore === null) {
      continue;
    }

    explanations.push(...fieldExplanations);
    totalScore += eventScore;
  }

  const score = totalScore / topologyExpected.length;
  return {
    score,
    explanation:
      explanations.length > 0
        ? explanations.join('; ')
        : `All ${topologyExpected.length} event(s): causal_features and blast_radius matched expected`,
  };
};

export interface ContinuationTopologyCycle {
  ruleName?: string;
  writeItems?: Partial<SignificantEvent>[];
  /** Whether this cycle should reuse an established event ID. Undefined on the establishing cycle. */
  expectReuse?: boolean;
}

/**
 * Score continuation writes against the establishing cycle's emitted topology.
 * Each follow-up cycle with `expectReuse !== false` must preserve that topology in events_write;
 * a follow-up may add entries (a continued event can grow), so only dropped entries are penalized.
 * Measures topology stability (follow-up vs. establishing), not ground-truth correctness.
 * Follow-up items are matched to establishing items by event_id; falls back to index 0.
 */
export const scoreContinuationTopologyStability = (
  cycles: ContinuationTopologyCycle[]
): TopologyScore => {
  const establishingIndex = cycles.findIndex((cycle) => (cycle.writeItems?.length ?? 0) > 0);
  if (establishingIndex < 0) {
    return {
      score: null,
      explanation: 'No establishing events_write payload to score continuation topology against',
    };
  }

  const establishingItems = (cycles[establishingIndex].writeItems ?? []) as SignificantEvent[];
  const followUps = cycles
    .map((cycle, index) => ({ cycle, index }))
    .filter(
      ({ cycle, index }) =>
        index > establishingIndex &&
        (cycle.writeItems?.length ?? 0) > 0 &&
        cycle.expectReuse !== false
    );

  if (followUps.length === 0) {
    return {
      score: null,
      explanation: 'No continuation follow-up cycles with expected event reuse to score topology',
    };
  }

  const explanations: string[] = [];
  let totalScore = 0;
  let scoredCycles = 0;

  for (const { cycle, index } of followUps) {
    const writeItems = (cycle.writeItems ?? []) as SignificantEvent[];

    if (writeItems.length === 0 || establishingItems.length === 0) {
      explanations.push(`cycle ${index + 1} (${cycle.ruleName ?? '?'}): missing write item`);
      continue;
    }

    const cycleScores: number[] = [];
    for (const followUp of writeItems) {
      const establishing =
        (followUp.event_id
          ? establishingItems.find((e) => e.event_id === followUp.event_id)
          : undefined) ?? establishingItems[0];
      const result = scoreTopologyFields({
        actual: followUp,
        expected: establishing,
        eventLabel: establishing.event_id ?? 'establishing-0',
      });
      if (result.score !== null) {
        cycleScores.push(result.score);
        if (result.score < 1) {
          explanations.push(
            `cycle ${index + 1} (${cycle.ruleName ?? '?'}): ${result.explanations.join('; ')}`
          );
        }
      }
    }

    if (cycleScores.length === 0) {
      explanations.push(
        `cycle ${index + 1} (${
          cycle.ruleName ?? '?'
        }): establishing event has no topology fields — skipped`
      );
      continue;
    }

    totalScore += cycleScores.reduce((a, b) => a + b, 0) / cycleScores.length;
    scoredCycles++;
  }

  if (scoredCycles === 0) {
    return {
      score: null,
      explanation:
        explanations.length > 0
          ? explanations.join('; ')
          : 'No follow-up cycles had scorable topology',
    };
  }

  const score = totalScore / scoredCycles;
  return {
    score,
    explanation:
      explanations.length > 0
        ? explanations.join('; ')
        : `All ${scoredCycles} continuation cycle(s) preserved establishing topology in events_write`,
  };
};

/**
 * CODE evaluator: recall over causal_features and blast_radius feature IDs against
 * expected_significant_events. Only scores events that declare at least one topology field.
 * Each expected event is matched to the actual event with the highest rule UUID overlap in signals.
 */
export const topologyCorrectnessEvaluator: DiscoveryEvaluator = {
  name: 'topology_correctness',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output, expected }) => {
    const result = scoreTopologyCorrectness(
      output?.significantEvents ?? [],
      expected?.expected_significant_events ?? []
    );

    if (result.score === null) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: result.explanation,
      });
    }

    return Promise.resolve(result);
  },
};
