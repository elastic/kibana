/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNCONFIRMED_EVENT_MAX_CONFIDENCE } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../../types';
import { summarizeEsqlGrounding } from '../../utils/tool_usage';

/**
 * CODE evaluator: the agent must have run `execute_esql` this cycle, and every `active` event must
 * carry a `confirms` signal or be rated as unconfirmed (low severity, at most the unconfirmed-event
 * confidence). Score = valid active / active; null when none active.
 */
export const confirmedEvidencesEvaluator: DiscoveryEvaluator = {
  name: 'confirmed_evidences',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) => {
    const { significantEvents, steps } = output;
    const events = significantEvents ?? [];
    const openEvents = events.filter((e) => e.status === 'active');

    if (openEvents.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No active events — confirms-signal invariant does not apply',
      });
    }

    const esqlCallCount = summarizeEsqlGrounding(steps ?? []).noOfToolCalls;
    // Require at least one execute_esql call per active event from Step 1 grounding.
    const sufficientEsqlCoverage = esqlCallCount >= openEvents.length;

    let satisfied = 0;
    const issues: string[] = [];

    openEvents.forEach((event, i) => {
      const signals = (event.signals ?? []).filter((s) => s.type === 'detection');
      const hasConfirmsSignal = signals.some((s) => s.verdict === 'confirms');
      const isRatedAsUnconfirmed =
        event.severity === 'low' && (event.confidence ?? 0) <= UNCONFIRMED_EVENT_MAX_CONFIDENCE;

      if ((hasConfirmsSignal || isRatedAsUnconfirmed) && sufficientEsqlCoverage) {
        satisfied++;
      } else if (!sufficientEsqlCoverage) {
        issues.push(
          `[${i}] agent ran ${esqlCallCount} execute_esql call(s) for ${openEvents.length} active event(s) — insufficient per-event coverage`
        );
      } else {
        issues.push(
          `[${i}] active with no confirms signal, rated ${event.severity} at confidence ${
            event.confidence ?? 'unset'
          } instead of low at most ${UNCONFIRMED_EVENT_MAX_CONFIDENCE}`
        );
      }
    });

    const score = satisfied / openEvents.length;
    return Promise.resolve({
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${openEvents.length} active event(s) are confirmed, or rated as unconfirmed, on grounding-verified signals`,
    });
  },
};
