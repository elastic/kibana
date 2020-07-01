/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../helpers/setup_request';

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function hasHistoricalAgentData(setup: Setup) {
  const { client } = setup;

  const params = {
    terminateAfter: 1,
    apm: {
      types: [
        ProcessorEvent.error,
        ProcessorEvent.metric,
        ProcessorEvent.sourcemap,
        ProcessorEvent.transaction,
      ],
    },
    body: {
      size: 0,
    },
  };

  const resp = await client.search(params);
  const hasHistorialAgentData = resp.hits.total.value > 0;
  return hasHistorialAgentData;
}
