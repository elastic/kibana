/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { AT_TIMESTAMP } from '@kbn/apm-types/es_fields';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import type { APMEventClient } from './create_es_client/create_apm_event_client';

/** Rounded date math, so the probe is eligible for the ES shard request cache. */
const RECENT_WINDOW = 'now-24h/h';

const EXCLUDED_TIERS: DataTier[] = ['data_cold', 'data_frozen'];

const PROCESSOR_EVENTS = [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric];

/**
 * Bounds the probe to shards that `can_match` can resolve from index metadata.
 * Tiers are excluded rather than included so clusters without tier roles still
 * match. See the PR description for why each clause is needed.
 */
const RECENT_DATA_QUERY: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [
      { range: { [AT_TIMESTAMP]: { gte: RECENT_WINDOW } } },
      { bool: { must_not: [{ terms: { _tier: EXCLUDED_TIERS } }] } },
    ],
  },
};

type HasApmDataOperation = 'has_historical_agent_data' | 'observability_overview_has_apm_data';

const hasDataRequest = async (
  apmEventClient: APMEventClient,
  operationName: HasApmDataOperation,
  query?: estypes.QueryDslQueryContainer
): Promise<boolean> => {
  // the `observability:searchExcludedDataTiers` setting will also be considered
  // in the `search` function to exclude data tiers from the search
  const params = {
    apm: { events: PROCESSOR_EVENTS },
    terminate_after: 1,
    track_total_hits: 1,
    size: 0,
    query,
  };

  const response = await apmEventClient.search(operationName, params);
  return response.hits.total.value > 0;
};

/**
 * Answers "does this cluster hold any APM data, ever" with a cheap recent-window
 * probe, falling back to an unbounded one only when that finds nothing.
 */
export const hasApmData = async (
  apmEventClient: APMEventClient,
  operationName: HasApmDataOperation
): Promise<boolean> => {
  const hasRecentData = await hasDataRequest(apmEventClient, operationName, RECENT_DATA_QUERY);

  if (hasRecentData) {
    return true;
  }

  return hasDataRequest(apmEventClient, operationName);
};
