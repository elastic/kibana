/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughput } from '../../../lib/helpers/calculate_throughput';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { ServicesItemsSetup } from './get_services_items';
import { serviceGroupQuery } from '../../../../common/utils/service_group_query';
import { ServiceGroup } from '../../../../common/service_groups';

interface AggregationParams {
  environment: string;
  kuery: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  maxNumServices: number;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
}

export async function getServiceTransactionStats({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  maxNumServices,
  start,
  end,
  serviceGroup,
}: AggregationParams) {
  const { apmEventClient } = setup;

  const outcomes = getOutcomeAggregation();

  const metrics = {
    avg_duration: {
      avg: {
        field: getDurationFieldForTransactions(searchAggregatedTransactions),
      },
    },
    outcomes,
  };

  const response = await apmEventClient.search(
    'get_service_transaction_stats',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...getDocumentTypeFilterForTransactions(
                searchAggregatedTransactions
              ),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...serviceGroupQuery(serviceGroup),
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              field: SERVICE_NAME,
              size: maxNumServices,
            },
            aggs: {
              transactionType: {
                terms: {
                  field: TRANSACTION_TYPE,
                },
                aggs: {
                  ...metrics,
                  environments: {
                    terms: {
                      field: SERVICE_ENVIRONMENT,
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
                },
              },
            },
          },
        },
      },
    }
  );

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      const topTransactionTypeBucket =
        bucket.transactionType.buckets.find(
          ({ key }) =>
            key === TRANSACTION_REQUEST || key === TRANSACTION_PAGE_LOAD
        ) ?? bucket.transactionType.buckets[0];

      return {
        serviceName: bucket.key as string,
        transactionType: topTransactionTypeBucket.key as string,
        environments: topTransactionTypeBucket.environments.buckets.map(
          (environmentBucket) => environmentBucket.key as string
        ),
        agentName: topTransactionTypeBucket.sample.top[0].metrics[
          AGENT_NAME
        ] as AgentName,
        latency: topTransactionTypeBucket.avg_duration.value,
        transactionErrorRate: calculateFailedTransactionRate(
          topTransactionTypeBucket.outcomes
        ),
        throughput: calculateThroughput({
          start,
          end,
          value: topTransactionTypeBucket.doc_count,
        }),
      };
    }) ?? []
  );
}
