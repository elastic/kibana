/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SERVICE_RUNTIME_NAME,
  CLOUD_PROVIDER,
  CLOUD_SERVICE_NAME,
  TELEMETRY_SDK_NAME,
  TELEMETRY_SDK_LANGUAGE,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ServerlessType } from '../../../common/serverless';
import { getServerlessTypeFromCloudData } from '../../../common/serverless';
import { maybe } from '../../../common/utils/maybe';

export interface ServiceAgentResponse {
  agentName?: string;
  runtimeName?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
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
  const fields = asMutableArray([
    AGENT_NAME,
    TELEMETRY_SDK_NAME,
    TELEMETRY_SDK_LANGUAGE,
    SERVICE_RUNTIME_NAME,
    CLOUD_PROVIDER,
    CLOUD_SERVICE_NAME,
  ] as const);

  const params = {
    terminate_after: 1,
    apm: {
      events: [
        ProcessorEvent.span,
        ProcessorEvent.error,
        ProcessorEvent.transaction,
        ProcessorEvent.metric,
      ],
    },
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
    fields,
    sort: {
      _score: { order: 'desc' as const },
    },
  };

  const response = await apmEventClient.search('get_service_agent_name', params);
  const hit = maybe(response.hits.hits[0]);
  if (!hit) {
    return {};
  }

  const event = unflattenKnownApmEventFields(hit.fields);

  const { agent, service, cloud, telemetry } = event;
  const serverlessType = getServerlessTypeFromCloudData(cloud?.provider, cloud?.service?.name);

  return {
    agentName: agent?.name,
    telemetrySdkName: telemetry?.sdk?.name,
    telemetrySdkLanguage: telemetry?.sdk?.language,
    runtimeName: service?.runtime?.name,
    serverlessType,
  };
}
