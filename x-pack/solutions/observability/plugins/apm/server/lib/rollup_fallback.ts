/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RollupInterval } from '../../common/rollup';

// Finer rollup intervals to fall back to (ordered coarse -> fine). A coarse rollup (e.g. 60m) can be
// globally present but miss an individual entity (service or transaction group) whose only metric
// document fell outside the queried window or was never written for that tier, so the entity
// silently disappears. Falling back to a finer tier recovers the data transparently.
export const ROLLUP_FALLBACK_ORDER: readonly RollupInterval[] = [
  RollupInterval.SixtyMinutes,
  RollupInterval.TenMinutes,
  RollupInterval.OneMinute,
];

/**
 * Returns the finest rollup interval to fall back to from the requested one, or `undefined` when the
 * requested interval is unknown or already the finest tier (nothing finer to recover from).
 */
export function getFinestRollupFallback(
  rollupInterval: RollupInterval
): RollupInterval | undefined {
  const currentIndex = ROLLUP_FALLBACK_ORDER.indexOf(rollupInterval);
  if (currentIndex < 0 || currentIndex === ROLLUP_FALLBACK_ORDER.length - 1) {
    return undefined;
  }
  return ROLLUP_FALLBACK_ORDER[ROLLUP_FALLBACK_ORDER.length - 1];
}

/**
 * Orchestrates the rollup-interval fallback shared by the service inventory and transaction-group
 * routes. It first runs a cheap `countEntities` probe at both the requested (coarse) rollup and the
 * finest tier; only when the finest tier exposes more entities does it re-query the full result at
 * the finer tier and flag it via `fellBackToRollupInterval` so the UI can inform the user.
 *
 * Callers supply the entity-specific probe (`countEntities`) and full query (`queryRollupInterval`),
 * keeping their own field/filter differences while sharing the tier selection, count comparison and
 * decision logic.
 */
export async function withRollupFallback<T>({
  enableRollupFallback,
  isRolledUpMetric,
  rollupInterval,
  countEntities,
  queryRollupInterval,
}: {
  enableRollupFallback: boolean;
  isRolledUpMetric: boolean;
  rollupInterval: RollupInterval;
  countEntities: (rollupInterval: RollupInterval) => Promise<number>;
  queryRollupInterval: (rollupInterval: RollupInterval) => Promise<T>;
}): Promise<{ result: T; fellBackToRollupInterval?: RollupInterval }> {
  const finestRollup = getFinestRollupFallback(rollupInterval);

  if (enableRollupFallback && isRolledUpMetric && finestRollup) {
    const [coarseCount, finestCount] = await Promise.all([
      countEntities(rollupInterval),
      countEntities(finestRollup),
    ]);

    if (finestCount > coarseCount) {
      const result = await queryRollupInterval(finestRollup);
      return { result, fellBackToRollupInterval: finestRollup };
    }
  }

  const result = await queryRollupInterval(rollupInterval);
  return { result };
}
