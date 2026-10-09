/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import { AT_TIMESTAMP } from '@kbn/apm-types/es_fields';
import type { APMEventClient } from './create_es_client/create_apm_event_client';

/**
 * Recent-data window for the fast phase-1 probe, expressed as ES date-math
 * rounded to the hour. Rounding is what makes the result eligible for the
 * ES shard request cache, so repeated calls within a polling interval are
 * near-free. Written as date math (not epoch millis) so the `range` clause
 * is resolvable from index metadata and lets `can_match` prune shards.
 */
const HAS_DATA_RECENT_WINDOW = 'now-24h/h';

const HAS_DATA_EVENTS = [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric];

const hasDataRequest = async (
  apmEventClient: APMEventClient,
  operationName: string,
  options?: { recentOnly: boolean }
) => {
  const query = options?.recentOnly
    ? {
        bool: {
          filter: [
            /**
             * Restrict to recent data so ES `can_match` can prune cold/frozen
             * shards and CCS remote shards with no recent data. A bare
             * `processor.event` terms filter (the only clause the client adds)
             * is not resolvable from index metadata, so without this range
             * every shard on every tier is contacted.
             *
             * Cold/frozen are excluded rather than hot/warm being included so
             * that self-managed clusters without tier roles (landing in
             * `data_content` or with no `_tier` at all) are not incorrectly
             * pushed to the slow phase.
             */
            {
              range: {
                [AT_TIMESTAMP]: { gte: HAS_DATA_RECENT_WINDOW },
              },
            },
            {
              bool: {
                must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }],
              },
            },
          ],
        },
      }
    : undefined;

  // the `observability:searchExcludedDataTiers` setting will also be considered
  // in the `search` function to exclude data tiers from the search
  const params = {
    apm: {
      events: HAS_DATA_EVENTS,
    },
    terminate_after: 1,
    track_total_hits: 1,
    size: 0,
    query,
  };

  const response = await apmEventClient.search(operationName, params);
  return response.hits.total.value > 0;
};

/**
 * Answers "does this cluster hold any APM data, ever" in two phases: a cheap
 * recent-window probe first, then an unbounded fallback only when it finds
 * nothing. `operationName` is forwarded to the ES client so each caller stays
 * distinguishable in APM traces and `_inspect` output.
 */
export const hasApmData = async (
  apmEventClient: APMEventClient,
  operationName: string
): Promise<boolean> => {
  // Phase 1 — fast path. On a live deployment this hits only a handful of
  // shards and returns in milliseconds, instead of fanning out across the
  // whole APM shard footprint.
  const hasRecentData = await hasDataRequest(apmEventClient, operationName, { recentOnly: true });

  if (hasRecentData) {
    return true;
  }

  // Phase 2 — exact fallback. Phase 1 found nothing, which means either the
  // cluster is genuinely empty or all its data is older than
  // HAS_DATA_RECENT_WINDOW (or lives solely in cold/frozen tiers). Re-run
  // without bounds to preserve the original "any APM doc, anywhere, ever"
  // semantics.
  return hasDataRequest(apmEventClient, operationName);
};
