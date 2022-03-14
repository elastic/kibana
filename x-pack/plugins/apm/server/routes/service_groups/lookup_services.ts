/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { MAX_NUMBER_OF_SERVICES_IN_GROUP } from '../../../common/service_groups';

export async function lookupServices({
  setup,
  kuery,
  start,
  end,
}: {
  setup: Setup;
  kuery: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('lookup_services', {
    apm: {
      events: [
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.error,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...kqlQuery(kuery)],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: MAX_NUMBER_OF_SERVICES_IN_GROUP,
          },
          aggs: {
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
              },
            },
            latest: {
              top_metrics: {
                metrics: [{ field: AGENT_NAME } as const],
                sort: { '@timestamp': 'desc' },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      return {
        serviceName: bucket.key as string,
        environments: bucket.environments.buckets.map(
          (envBucket) => envBucket.key as string
        ),
        agentName: bucket.latest.top[0].metrics[AGENT_NAME] as AgentName,
      };
    }) ?? []
  );
}
