/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../helpers/setup_request';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { AGENT_NAME } from '../../../../common/elasticsearch_fieldnames';

export async function getAgentNameByService({
  serviceName,
  setup,
}: {
  serviceName: string;
  setup: Setup;
}) {
  const { apmEventClient } = setup;

  const params = {
    terminateAfter: 1,
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
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

  const { aggregations } = await apmEventClient.search(params);
  const agentName = aggregations?.agent_names.buckets[0]?.key;
  return agentName as string | undefined;
}
