/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { SERVICE_NODE_NAME_MISSING } from '../../../common/service_nodes';
import {
  AGENT_NAME,
  AGENT_VERSION,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const MAX_NUMBER_OF_SERVICE_NODES = 500;

export type AgentExplorerAgentInstancesResponse = Array<{
  serviceNode: string;
  environments: string[];
  agentVersion: string;
  lastReport: string;
}>;

export async function getAgentInstances({
  environment,
  serviceName,
  kuery,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  serviceName?: string;
  kuery: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<AgentExplorerAgentInstancesResponse> {
  const response = await apmEventClient.search('get_agent_instances', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: AGENT_NAME,
              },
            },
            {
              exists: {
                field: AGENT_VERSION,
              },
            },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...(serviceName ? termQuery(SERVICE_NAME, serviceName) : []),
          ],
        },
      },
      aggs: {
        serviceNodes: {
          terms: {
            field: SERVICE_NODE_NAME,
            missing: SERVICE_NODE_NAME_MISSING,
            size: MAX_NUMBER_OF_SERVICE_NODES,
          },
          aggs: {
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
              },
            },
            sample: {
              top_metrics: {
                metrics: [{ field: AGENT_VERSION } as const],
                sort: {
                  '@timestamp': 'desc' as const,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.serviceNodes.buckets.map((agentInstance) => ({
      serviceNode: agentInstance.key as string,
      environments: agentInstance.environments.buckets.map(
        (environmentBucket) => environmentBucket.key as string
      ),
      agentVersion: agentInstance.sample.top[0].metrics[
        AGENT_VERSION
      ] as string,
      lastReport: agentInstance.sample.top[0].sort[0] as string,
    })) ?? []
  );
}
