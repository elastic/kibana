/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapServiceStats } from '@kbn/apm-types';
import { FAILURE_RATE_DANGER, MIN_REQUESTS_FOR_FAILURE_RATE } from './constants';

/** How many failing members a group node lists by name (worst first). The count can be higher. */
const MAX_FAILING_MEMBERS_SHOWN = 3;

/** Stats rolled up for a group of services (no transaction type — groups mix types). */
export interface AggregatedServiceMapStats {
  throughput: number;
  failedTransactionRate: number | null;
  latency: number | null;
  requestCount: number;
}

export interface FailingServiceMember {
  id: string;
  failedTransactionRate: number;
}

type MemberStats = Pick<
  ServiceMapServiceStats,
  'throughput' | 'failedTransactionRate' | 'latency' | 'requestCount'
>;

/**
 * Sums requests, weights the failure rate by throughput, and takes the worst latency across
 * member stats. Returns undefined when no member carries stats.
 */
export function aggregateServiceMapStats(
  memberStats: ReadonlyArray<MemberStats | undefined>
): AggregatedServiceMapStats | undefined {
  let hasStats = false;
  let throughput = 0;
  let failedWeighted = 0;
  let requestCount = 0;
  let latency: number | undefined;

  for (const stats of memberStats) {
    if (!stats) {
      continue;
    }
    hasStats = true;
    throughput += stats.throughput;
    failedWeighted += stats.throughput * (stats.failedTransactionRate ?? 0);
    requestCount += stats.requestCount;
    if (typeof stats.latency === 'number') {
      latency = Math.max(latency ?? 0, stats.latency);
    }
  }

  if (!hasStats) {
    return undefined;
  }

  return {
    throughput,
    failedTransactionRate: throughput > 0 ? failedWeighted / throughput : null,
    latency: latency ?? null,
    requestCount,
  };
}

/**
 * Members failing at least 5% of requests, with enough volume for the rate to mean something.
 * Names the worst few; `failingMemberCount` is the full count.
 */
export function getFailingServiceMembers(
  members: ReadonlyArray<{ id: string; stats?: MemberStats }>
): { failingMembers: FailingServiceMember[]; failingMemberCount: number } {
  const failing = members
    .filter(
      (member) =>
        (member.stats?.failedTransactionRate ?? 0) >= FAILURE_RATE_DANGER &&
        (member.stats?.requestCount ?? 0) >= MIN_REQUESTS_FOR_FAILURE_RATE
    )
    .map((member) => ({
      id: member.id,
      failedTransactionRate: member.stats?.failedTransactionRate ?? 0,
    }))
    .sort((a, b) => b.failedTransactionRate - a.failedTransactionRate || a.id.localeCompare(b.id));

  return {
    failingMembers: failing.slice(0, MAX_FAILING_MEMBERS_SHOWN),
    failingMemberCount: failing.length,
  };
}
