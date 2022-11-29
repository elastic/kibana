/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termsQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { IEnvOptions } from './get_service_map';

export async function getServiceStats({
  environment,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
  maxNumberOfServices,
  serviceGroupKuery,
  serviceName,
}: IEnvOptions & { maxNumberOfServices: number }) {
  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric as const,
        ProcessorEvent.error as const,
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...termsQuery(SERVICE_NAME, serviceName),
            ...kqlQuery(serviceGroupKuery),
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: maxNumberOfServices,
          },
          aggs: {
            agent_name: {
              terms: {
                field: AGENT_NAME,
              },
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_service_stats_for_service_map',
    params
  );

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      return {
        [SERVICE_NAME]: bucket.key as string,
        [AGENT_NAME]:
          (bucket.agent_name.buckets[0]?.key as string | undefined) || '',
        [SERVICE_ENVIRONMENT]:
          environment === ENVIRONMENT_ALL.value ? null : environment,
      };
    }) || []
  );
}
