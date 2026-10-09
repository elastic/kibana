/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

// Look back over a recent window first. Time-based shard skipping keeps this
// cheap on large APM deployments, which is the common case where recent data
// exists. Only if nothing is found do we fall back to the expensive unbounded
// check that fans out across the whole APM shard footprint.
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function hasHistoricalAgentData(apmEventClient: APMEventClient): Promise<boolean> {
  // Fast path: a recent, time-bounded existence check scoped to transaction and
  // error events only. Excluding metric events avoids expanding to the full
  // `metrics-apm.app.*` index set, which is the dominant source of shard
  // fan-out on large deployments.
  const end = Date.now();
  const start = end - RECENT_WINDOW_MS;

  const hasRecentData = await hasDataRequest(apmEventClient, {
    events: [ProcessorEvent.error, ProcessorEvent.transaction],
    query: {
      bool: {
        filter: rangeQuery(start, end),
      },
    },
  });

  if (hasRecentData) {
    return true;
  }

  // Slow path: broaden to the original unbounded check (all event types, no
  // time filter) so clusters with only old data or metric-only data still
  // report correctly.
  const events = [ProcessorEvent.error, ProcessorEvent.metric, ProcessorEvent.transaction];

  const hasDataInWarmOrHotDataTiers = await hasDataRequest(apmEventClient, {
    events,
    query: { terms: { _tier: ['data_hot', 'data_warm'] } },
  });

  if (hasDataInWarmOrHotDataTiers) {
    return true;
  }

  const hasDataUnbounded = await hasDataRequest(apmEventClient, { events });

  return hasDataUnbounded;
}

async function hasDataRequest(
  apmEventClient: APMEventClient,
  {
    events,
    query,
  }: {
    events: ProcessorEvent[];
    query?: estypes.QueryDslQueryContainer;
  }
): Promise<boolean> {
  // the `observability:searchExcludedDataTiers` setting will also be considered
  // in the `search` function to exclude data tiers from the search
  const params = {
    apm: {
      events,
    },
    terminate_after: 1,
    track_total_hits: 1 as const,
    size: 0,
    query,
  };

  const resp = await apmEventClient.search('has_historical_agent_data', params);
  return resp.hits.total.value > 0;
}
