/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function hasHistoricalAgentData(setup: Setup) {
  const { apmEventClient } = setup;

  const params = {
    terminate_after: 1,
    apm: {
      events: [
        ProcessorEvent.error,
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
      ],
    },
    body: {
      size: 0,
    },
  };

  const resp = await apmEventClient.search('has_historical_agent_data', params);
  return resp.hits.total.value > 0;
}
