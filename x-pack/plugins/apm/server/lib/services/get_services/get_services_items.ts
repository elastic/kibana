/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_DURATION,
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import { getServicesProjection } from '../../../../common/projections/services';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { ESClient } from '../../helpers/es_client';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export async function getServicesItems({
  start,
  end,
  uiFiltersES,
  indices,
  client,
}: {
  start: number;
  end: number;
  uiFiltersES: ESFilter[];
  indices: ApmIndicesConfig;
  client: ESClient;
}) {
  const projection = getServicesProjection({
    start,
    end,
    uiFiltersES,
    indices,
  });

  const params = {
    body: {
      index: projection.index,
      size: 0,
      query: projection.body.query,
      aggs: {
        services: {
          terms: {
            field: projection.body.aggs.services.terms.field,
            size: 500,
          },
          aggs: {
            avg: {
              avg: { field: TRANSACTION_DURATION },
            },
            agents: {
              terms: { field: AGENT_NAME, size: 1 },
            },
            events: {
              terms: { field: PROCESSOR_EVENT },
            },
            environments: {
              terms: { field: SERVICE_ENVIRONMENT },
            },
          },
        },
      },
    },
  };

  const resp = await client.search(params);
  const aggs = resp.aggregations;

  const serviceBuckets = aggs?.services.buckets || [];

  const items = serviceBuckets.map((bucket) => {
    const eventTypes = bucket.events.buckets;

    const transactions = eventTypes.find((e) => e.key === 'transaction');
    const totalTransactions = transactions?.doc_count || 0;

    const errors = eventTypes.find((e) => e.key === 'error');
    const totalErrors = errors?.doc_count || 0;

    const deltaAsMinutes = (end - start) / 1000 / 60;
    const transactionsPerMinute = totalTransactions / deltaAsMinutes;
    const errorsPerMinute = totalErrors / deltaAsMinutes;

    const environmentsBuckets = bucket.environments.buckets;
    const environments = environmentsBuckets.map(
      (environmentBucket) => environmentBucket.key as string
    );

    return {
      serviceName: bucket.key as string,
      agentName: bucket.agents.buckets[0]?.key as string | undefined,
      transactionsPerMinute,
      errorsPerMinute,
      avgResponseTime: bucket.avg.value,
      environments,
    };
  });

  return items;
}
