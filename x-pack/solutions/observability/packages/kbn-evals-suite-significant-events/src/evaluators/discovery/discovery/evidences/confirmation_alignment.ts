/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';
import { alignExpectedEventsToActuals } from '../common/align_events';

const asSet = (values: string[]): Set<string> => new Set(values);

const getRuleSignals = (event: SignificantEvent) =>
  (event.signals ?? []).flatMap((signal) =>
    signal.type === 'detection' && signal.metadata?.rule_uuid
      ? [
          {
            ruleUuid: signal.metadata.rule_uuid,
            collected_at: signal.collected_at,
            evidence: signal.evidence,
            verdict: signal.verdict,
          },
        ]
      : []
  );

export const confirmationAlignmentEvaluator: DiscoveryEvaluator = {
  name: 'confirmation_alignment',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output, expected }) => {
    const expectedByEvent = expected?.expected_confirmed_rule_uuids;
    if (!expectedByEvent || Object.keys(expectedByEvent).length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No expected confirmed rule UUIDs declared',
      });
    }

    const entries = Object.entries(expectedByEvent);
    const alignmentKeys = entries.map(([eventId, ruleUuids]) => ({
      event_id: eventId,
      expectedRuleUuids: new Set(ruleUuids),
    }));
    const matches = alignExpectedEventsToActuals(alignmentKeys, output.significantEvents);

    const issues: string[] = [];
    let matched = 0;

    for (let i = 0; i < entries.length; i++) {
      const [eventId, expectedRuleUuids] = entries[i];
      const expectedRuleSet = asSet(expectedRuleUuids);
      const event = matches[i];

      if (!event) {
        issues.push(`${eventId}: missing from agent output`);
        continue;
      }

      // Only detection signals carry a rule identity; other signal types (manual ES|QL
      // evidence, KI grounding) are outside the expected-membership contract.
      const ruleSignals = getRuleSignals(event);
      const actualRuleUuids = asSet(
        ruleSignals
          .filter((signal) => signal.verdict === 'confirms')
          .map((signal) => signal.ruleUuid)
      );
      const nonMembersWithoutRejection = ruleSignals
        .filter(
          (signal) =>
            !expectedRuleSet.has(signal.ruleUuid) &&
            (signal.verdict === 'confirms' ||
              signal.verdict === 'inconclusive' ||
              signal.verdict === 'not_checked')
        )
        .map((signal) => signal.ruleUuid);
      const isExactMatch =
        actualRuleUuids.size === expectedRuleSet.size &&
        [...actualRuleUuids].every((ruleUuid) => expectedRuleSet.has(ruleUuid)) &&
        nonMembersWithoutRejection.length === 0;

      if (isExactMatch) {
        matched++;
      } else {
        issues.push(
          `${eventId}: expected [${[...expectedRuleSet].sort().join(', ')}], received [${[
            ...actualRuleUuids,
          ]
            .sort()
            .join(', ')}]${
            nonMembersWithoutRejection.length > 0
              ? `; expected non-blocking verdict for [${nonMembersWithoutRejection
                  .sort()
                  .join(', ')}]`
              : ''
          }`
        );
      }
    }

    const score = matched / Object.keys(expectedByEvent).length;
    return Promise.resolve({
      score,
      explanation:
        issues.length === 0
          ? 'Confirmed signal membership matches every expected event'
          : issues.join('; '),
    });
  },
};
