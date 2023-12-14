/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function hasHistoricalAgentData(
  apmEventClient: APMEventClient,
  { limitByDataTier } = { limitByDataTier: false }
) {
  const query = limitByDataTier
    ? { terms: { _tier: ['data_hot', 'data_warm'] } }
    : undefined;

  const params = {
    apm: {
      events: [
        ProcessorEvent.error,
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
      ],
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
