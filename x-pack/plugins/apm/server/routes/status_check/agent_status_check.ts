/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export interface AgentStatusCheckResponse {
  status: boolean;
}

export async function checkAgentStatus({
  apmEventClient,
}: {
  apmEventClient: APMEventClient;
}): Promise<AgentStatusCheckResponse> {
  const params = {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      track_total_hits: true,
      size: 1,
      query: {
        bool: {
          filter: [
            {
              terms: {
                'processor.event': ['error', 'transaction', 'metric'],
              },
            },
          ],
        },
      },
    },
  };

  const resp = await apmEventClient.search('agent_status_check', params);

  return {
    status: resp.hits.hits.length > 0,
  };
}
