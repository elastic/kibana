/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common/processor_event';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server/utils/queries';
import {
  AGENT_NAME,
  AGENT_VERSION,
  LABEL_TELEMETRY_AUTO_VERSION,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { MAX_NUMBER_OF_SERVICES } from '../services/get_services/get_services_items';

interface AggregationParams {
  environment: string;
  serviceName?: string;
  agentLanguage?: string;
  kuery: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}

export async function getAgentsItems({
  environment,
  agentLanguage,
  serviceName,
  kuery,
  apmEventClient,
  start,
  end,
  randomSampler,
}: AggregationParams) {
  const response = await apmEventClient.search('get_agent_details', {
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
            ...(agentLanguage
              ? termQuery(SERVICE_LANGUAGE_NAME, agentLanguage)
              : []),
          ],
        },
      },
      aggs: {
        sample: {
          random_sampler: randomSampler,
          aggs: {
            services: {
              terms: {
                field: SERVICE_NAME,
                size: MAX_NUMBER_OF_SERVICES,
              },
              aggs: {
                instances: {
                  cardinality: {
                    field: SERVICE_NODE_NAME,
                  },
                },
                agentTelemetryAutoVersions: {
                  terms: {
                    field: LABEL_TELEMETRY_AUTO_VERSION,
                  },
                },
                agentVersions: {
                  terms: {
                    field: AGENT_VERSION,
                  },
                },
                sample: {
                  top_metrics: {
                    metrics: [{ field: AGENT_NAME } as const],
                    sort: {
                      '@timestamp': 'desc' as const,
                    },
                  },
                },
                environments: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.sample.services.buckets.map((bucket) => {
      return {
        serviceName: bucket.key as string,
        environments: bucket.environments.buckets.map(
          (env) => env.key as string
        ),
        agentName: bucket.sample.top[0].metrics[AGENT_NAME] as AgentName,
        agentVersion: bucket.agentVersions.buckets.map(
          (version) => version.key as string
        ),
        agentTelemetryAutoVersion:
          bucket.agentTelemetryAutoVersions.buckets.map(
            (version) => version.key as string
          ),
        // service.node.name is set by the server only if a container.id or host.name are set. Otherwise should be explicitly set by agents.
        instances: (bucket.instances.value as number) || 1,
      };
    }) ?? []
  );
}
