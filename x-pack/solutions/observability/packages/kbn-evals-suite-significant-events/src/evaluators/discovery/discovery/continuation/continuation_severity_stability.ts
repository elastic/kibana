/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContinuationCycle, ContinuationEvaluator } from './continuation_stability';
import { severityRank } from '../severity/severity_rank';

export interface ContinuationSeverityStabilityResult {
  score: number | null;
  stableChecks: number;
  comparableChecks: number;
  explanation: string;
}

/**
 * Scores active continuations against their establishing tier and recovery against the latest active tier.
 */
export const scoreContinuationSeverityStability = (
  cycles: ContinuationCycle[]
): ContinuationSeverityStabilityResult => {
  const baselineSeverityByEventId = new Map<string, number>();
  const latestActiveSeverityByEventId = new Map<string, number>();
  let stableChecks = 0;
  let comparableChecks = 0;
  const issues: string[] = [];

  cycles.forEach((cycle, cycleIndex) => {
    const scoreCycle = cycle.expectReuse !== false || baselineSeverityByEventId.size === 0;
    for (const { event_id: eventId, status, severity } of cycle.producedEvents ?? []) {
      if (!eventId || !severity) continue;
      const isActive = status === 'active';
      if (!isActive && status !== 'recovering' && status !== 'inactive') continue;

      const followUpRank = severityRank(severity);
      if (isActive && followUpRank !== undefined) {
        latestActiveSeverityByEventId.set(eventId, followUpRank);
      }
      if (!scoreCycle) continue;

      const baselineRank = (
        isActive ? baselineSeverityByEventId : latestActiveSeverityByEventId
      ).get(eventId);
      if (baselineRank === undefined) {
        if (isActive && followUpRank !== undefined) {
          baselineSeverityByEventId.set(eventId, followUpRank);
        }
        continue;
      }
      comparableChecks++;
      if (followUpRank === undefined) {
        issues.push(
          `cycle ${cycleIndex}: continued event "${eventId}" has missing or invalid severity`
        );
        continue;
      }

      const isStable = isActive ? followUpRank <= baselineRank : followUpRank === baselineRank;
      if (isStable) {
        stableChecks++;
        continue;
      }

      issues.push(
        isActive
          ? `cycle ${cycleIndex}: severity downgraded for continued event "${eventId}" (${severity})`
          : `cycle ${cycleIndex}: recovery changed severity for event "${eventId}" (${severity})`
      );
    }
  });

  if (comparableChecks === 0) {
    return {
      score: null,
      stableChecks: 0,
      comparableChecks: 0,
      explanation:
        issues.length > 0
          ? `No comparable continued events with severity: ${issues.join('; ')}`
          : 'No comparable continuations or recoveries with a known active severity',
    };
  }

  const score = stableChecks / comparableChecks;
  return {
    score,
    stableChecks,
    comparableChecks,
    explanation:
      issues.length > 0
        ? `${stableChecks}/${comparableChecks} continued event(s) satisfied severity stability (${issues.join(
            '; '
          )})`
        : `All ${comparableChecks} continued event(s) satisfied severity stability`,
  };
};

/** CODE evaluator: active continuations must not downgrade, and recovery must preserve the latest active tier. */
export const continuationSeverityStabilityEvaluator: ContinuationEvaluator = {
  name: 'continuation_severity_stability',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) =>
    Promise.resolve(scoreContinuationSeverityStability(output.cycles ?? [])),
};
