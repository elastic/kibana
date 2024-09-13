/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SERVICE_RUNTIME_NAME,
  CLOUD_PROVIDER,
  CLOUD_SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getServerlessTypeFromCloudData, ServerlessType } from '../../../common/serverless';

interface ServiceAgent {
  agent?: {
    name: string;
  };
  service?: {
    runtime?: {
      name?: string;
    };
  };
  cloud?: {
    provider?: string;
    service?: {
      name?: string;
    };
  };
}

export interface ServiceAgentResponse {
  agentName?: string;
  runtimeName?: string;
  serverlessType?: ServerlessType;
}

export async function getServiceAgent({
  serviceName,
  apmEventClient,
  start,
  end,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ServiceAgentResponse> {
  const params = {
    terminate_after: 1,
    apm: {
      events: [ProcessorEvent.error, ProcessorEvent.transaction, ProcessorEvent.metric],
    },
    body: {
      track_total_hits: 1,
      size: 1,
      _source: [AGENT_NAME, SERVICE_RUNTIME_NAME, CLOUD_PROVIDER, CLOUD_SERVICE_NAME],
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            {
              exists: {
                field: AGENT_NAME,
              },
            },
          ],
          should: [
            {
              exists: {
                field: SERVICE_RUNTIME_NAME,
              },
            },
            {
              exists: {
                field: CLOUD_PROVIDER,
              },
            },
            {
              exists: {
                field: CLOUD_SERVICE_NAME,
              },
            },
          ],
        },
      },
      sort: {
        _score: { order: 'desc' as const },
      },
    },
  };

  const response = await apmEventClient.search('get_service_agent_name', params);
  if (response.hits.total.value === 0) {
    return {};
  }

  const { agent, service, cloud } = response.hits.hits[0]._source as ServiceAgent;
  const serverlessType = getServerlessTypeFromCloudData(cloud?.provider, cloud?.service?.name);

  return {
    agentName: agent?.name,
    runtimeName: service?.runtime?.name,
    serverlessType,
  };
}
