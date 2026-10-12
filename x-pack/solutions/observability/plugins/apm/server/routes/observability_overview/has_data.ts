/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityOverviewHasDataResponse } from '@kbn/apm-api-shared';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { AT_TIMESTAMP } from '@kbn/apm-types/es_fields';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * Recent-data window for the fast phase-1 probe, expressed as ES date-math
 * rounded to the hour. Rounding is what makes the result eligible for the
 * ES shard request cache, so repeated calls within a polling interval are
 * near-free. Written as date math (not epoch millis) so the `range` clause
 * is resolvable from index metadata and lets `can_match` prune shards.
 */
const HAS_DATA_RECENT_WINDOW = 'now-24h/h';

async function hasDataRequest(apmEventClient: APMEventClient, options?: { recentOnly: boolean }) {
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

  const params = {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric],
    },
    terminate_after: 1,
    track_total_hits: 1,
    size: 0,
    query,
  };

  const response = await apmEventClient.search('observability_overview_has_apm_data', params);
  return response.hits.total.value > 0;
}

export async function getHasData({
  indices,
  apmEventClient,
}: {
  indices: APMIndices;
  apmEventClient: APMEventClient;
}): Promise<ObservabilityOverviewHasDataResponse> {
  try {
    /**
     * Phase 1 — fast path.
     *
     * Restrict to recent data on hot/warm tiers so Elasticsearch's
     * `can_match` pre-filter can prune cold/frozen shards and CCS remote
     * shards that hold no recent data. On a live deployment this probe
     * hits only a handful of shards and returns in milliseconds.
     */
    const hasRecentData = await hasDataRequest(apmEventClient, { recentOnly: true });
    if (hasRecentData) {
      return { hasData: true, indices };
    }

    /**
     * Phase 2 — exact fallback.
     *
     * Phase 1 found nothing, which means either the cluster is genuinely
     * empty or all its data is older than HAS_DATA_RECENT_WINDOW (or
     * lives solely in cold/frozen tiers). Re-run without bounds to
     * preserve the original "any APM doc, anywhere, ever" semantics.
     */
    const hasData = await hasDataRequest(apmEventClient);
    return { hasData, indices };
  } catch (e) {
    return {
      hasData: false,
      indices,
    };
  }
}
