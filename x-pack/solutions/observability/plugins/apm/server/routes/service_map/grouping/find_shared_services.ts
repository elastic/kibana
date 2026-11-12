/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SHARED_MAX_SHARE,
  SHARED_MIN_CALLER_SHARE,
  SHARED_MIN_NEIGHBOURS,
  SHARED_NEIGHBOUR_STANDARD_DEVIATIONS,
} from './constants';
import type { ServiceCallStats } from './types';
import { compareNames } from './utils';

/**
 * Services that would tie every group to every other: called by at least a quarter of the map
 * (auth, logging), or with far more neighbours than is typical (a gateway calling hundreds).
 *
 * The second rule counts neighbours, services it calls and services that call it.
 * A service that is both called and calls a lot is as much a hub as one that only calls.
 *
 * Shares and the typical number of neighbours are over every service on the map, including those
 * with no calls. At most a small share of the map is shared, those with the most neighbours. Ties
 * are arbitrarily broken by name.
 */
export function findSharedServices({
  stats,
}: {
  /** Every service on the map. */
  stats: ReadonlyMap<string, ServiceCallStats>;
}): Set<string> {
  const serviceCount = stats.size;
  if (serviceCount === 0) {
    return new Set();
  }
  const neighbourCounts = [...stats.values()].map(({ neighbours }) => neighbours);
  const mean = neighbourCounts.reduce((sum, count) => sum + count, 0) / serviceCount;
  const variance =
    neighbourCounts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / serviceCount;
  const minNeighbours = Math.max(
    mean + SHARED_NEIGHBOUR_STANDARD_DEVIATIONS * Math.sqrt(variance),
    SHARED_MIN_NEIGHBOURS
  );
  const minCallers = SHARED_MIN_CALLER_SHARE * serviceCount;

  const shared = [...stats]
    .filter(([, { callers, neighbours }]) => callers >= minCallers || neighbours >= minNeighbours)
    .sort(([a, statsA], [b, statsB]) => statsB.neighbours - statsA.neighbours || compareNames(a, b))
    .slice(0, Math.floor(SHARED_MAX_SHARE * serviceCount))
    .map(([service]) => service);
  return new Set(shared);
}
