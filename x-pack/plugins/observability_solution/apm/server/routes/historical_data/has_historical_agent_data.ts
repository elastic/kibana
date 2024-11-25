/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function hasHistoricalAgentData(apmEventClient: APMEventClient) {
  const hasDataInWarmOrHotDataTiers = await hasDataRequest(apmEventClient, [
    'data_hot',
    'data_warm',
  ]);

  if (hasDataInWarmOrHotDataTiers) {
    return true;
  }

  const hasDataUnbounded = await hasDataRequest(apmEventClient);

  return hasDataUnbounded;
}

async function hasDataRequest(apmEventClient: APMEventClient, dataTiers?: DataTier[]) {
  // the `observability:searchExcludedDataTiers` setting will also be considered
  // in the `search` function to exclude data tiers from the search
  const query = dataTiers ? { terms: { _tier: dataTiers } } : undefined;

  const params = {
    apm: {
      events: [ProcessorEvent.error, ProcessorEvent.metric, ProcessorEvent.transaction],
    },
    body: {
      terminate_after: 1,
      track_total_hits: 1,
      size: 0,
      query,
    },
  };

  const resp = await apmEventClient.search('has_historical_agent_data', params);
  return resp.hits.total.value > 0;
}
