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
  SHARED_MIN_NEIGHBOURS_MEDIAN_MULTIPLE,
  SHARED_NEIGHBOUR_STANDARD_DEVIATIONS,
  SHARED_TYPICAL_MIN_NEIGHBOURS,
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
 * Shares are over every service on the map, including those with no calls. The typical number of
 * neighbours leaves out services already shared for their callers: a few services called by
 * hundreds would otherwise raise the bar so far that a gateway calling dozens stays under it. It
 * also leaves out services with fewer than 2 neighbours: where each team is a gateway in front of
 * its own backends, the backends would otherwise pull the typical count down to 1, and every
 * team's gateway would be shared, leaving its backends with no calls.
 *
 * Neighbour counts are skewed, so by chance a few ordinary services sit above the mean plus 3
 * standard deviations: a service also needs at least 3 times the median, and at least 10. At most
 * a small share of the map is shared, those with the most neighbours. Ties are arbitrarily broken
 * by name.
 *
 * Both rules count distinct services, not calls, so a stray call (a health check, a script run
 * once in the day) counts as much as a real dependency. Grouping by calls weighs those down, but
 * here they can still push a service over a threshold. Left for the later issue on keeping groups
 * steady as calls change.
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
  const minCallers = SHARED_MIN_CALLER_SHARE * serviceCount;
  const calledByMany = (callers: number) => callers >= minCallers;

  const neighbourCounts = [...stats.values()]
    .filter(
      ({ callers, neighbours }) =>
        !calledByMany(callers) && neighbours >= SHARED_TYPICAL_MIN_NEIGHBOURS
    )
    .map(({ neighbours }) => neighbours);
  const mean = average(neighbourCounts);
  const variance = average(neighbourCounts.map((count) => (count - mean) ** 2));
  const minNeighbours = Math.max(
    mean + SHARED_NEIGHBOUR_STANDARD_DEVIATIONS * Math.sqrt(variance),
    SHARED_MIN_NEIGHBOURS_MEDIAN_MULTIPLE * median(neighbourCounts),
    SHARED_MIN_NEIGHBOURS
  );

  const shared = [...stats]
    .filter(([, { callers, neighbours }]) => calledByMany(callers) || neighbours >= minNeighbours)
    .sort(([a, statsA], [b, statsB]) => statsB.neighbours - statsA.neighbours || compareNames(a, b))
    .slice(0, Math.floor(SHARED_MAX_SHARE * serviceCount))
    .map(([service]) => service);
  return new Set(shared);
}

/** The mean, 0 for no values. */
function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The middle value, the mean of the two middle ones for an even count, 0 for no values. */
function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
