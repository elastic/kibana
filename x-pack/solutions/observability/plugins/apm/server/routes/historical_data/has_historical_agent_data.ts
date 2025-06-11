/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { QueryDslRangeQuery } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function hasHistoricalAgentData(
  apmEventClient: APMEventClient,
  timeRange?: QueryDslRangeQuery
) {
  const ranges = resolveRanges(timeRange);

  for (const range of ranges) {
    const hasDataInWarmOrHotDataTiers = await hasDataRequest(apmEventClient, range, [
      'data_hot',
      'data_warm',
    ]);

    if (hasDataInWarmOrHotDataTiers) {
      return true;
    }
  }

  const hasDataUnbounded = await hasDataRequest(apmEventClient);

  return hasDataUnbounded;
}

async function hasDataRequest(
  apmEventClient: APMEventClient,
  range?: QueryDslRangeQuery,
  dataTiers?: DataTier[]
) {
  // the `observability:searchExcludedDataTiers` setting will also be considered
  // in the `search` function to exclude data tiers from the search
  const query: QueryDslQueryContainer[] = [];

  if (dataTiers) {
    query.push({ terms: { _tier: dataTiers } });
  }

  if (range) {
    query.push({ range: { '@timestamp': range } });
  }

  const params = {
    apm: {
      events: [ProcessorEvent.error, ProcessorEvent.metric, ProcessorEvent.transaction],
    },
    terminate_after: 1,
    track_total_hits: 1,
    size: 0,
    query: { bool: { filter: query } },
  };

  const resp = await apmEventClient.search('has_historical_agent_data', params);
  return resp.hits.total.value > 0;
}

function resolveRanges(timeRange?: QueryDslRangeQuery): QueryDslRangeQuery[] {
  if (!timeRange) {
    return [
      { gte: 'now-15m', lte: 'now' },
      { gte: 'now-3d', lte: 'now' },
    ];
  }

  if (timeRange.gte === 'now-15m') {
    return [timeRange, { gte: 'now-3d', lte: 'now' }];
  }

  return [{ gte: 'now-15m', lte: 'now' }, timeRange];
}
