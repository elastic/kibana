/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { AGENT_NAME } from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getAgentNameByService({
  serviceName,
  apmEventClient,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
}) {
  const params = {
    terminate_after: 1,
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [{ term: { [SERVICE_NAME]: serviceName } }],
        },
      },
      aggs: {
        agent_names: {
          terms: { field: AGENT_NAME, size: 1 },
        },
      },
    },
  };

  const { aggregations } = await apmEventClient.search('get_agent_name_by_service', params);
  const agentName = aggregations?.agent_names.buckets[0]?.key;
  return agentName as string | undefined;
}
