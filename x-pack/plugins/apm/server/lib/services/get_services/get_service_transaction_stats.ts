/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import {
  calculateTransactionErrorPercentage,
  getOutcomeAggregation,
} from '../../helpers/transaction_error_rate';
import { ServicesItemsSetup } from './get_services_items';
import { withApmSpan } from '../../../utils/with_apm_span';

interface AggregationParams {
  environment?: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
}

const MAX_NUMBER_OF_SERVICES = 500;

export async function getServiceTransactionStats({
  environment,
  setup,
  searchAggregatedTransactions,
}: AggregationParams) {
  return withApmSpan('get_service_transaction_stats', async () => {
    const { apmEventClient, start, end, esFilter } = setup;

    const outcomes = getOutcomeAggregation();

    const metrics = {
      avg_duration: {
        avg: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        },
      },
      outcomes,
    };

    const response = await apmEventClient.search({
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...getDocumentTypeFilterForAggregatedTransactions(
                searchAggregatedTransactions
              ),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...esFilter,
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              field: SERVICE_NAME,
              size: MAX_NUMBER_OF_SERVICES,
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
                      missing: '',
                    },
                  },
                  sample: {
                    top_metrics: {
                      metrics: { field: AGENT_NAME } as const,
                      sort: {
                        '@timestamp': 'desc',
                      },
                    },
                  },
                  timeseries: {
                    date_histogram: {
                      field: '@timestamp',
                      fixed_interval: getBucketSize({
                        start,
                        end,
                        numBuckets: 20,
                      }).intervalString,
                      min_doc_count: 0,
                      extended_bounds: { min: start, max: end },
                    },
                    aggs: metrics,
                  },
                },
              },
            },
          },
        },
      },
    });

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
          environments: topTransactionTypeBucket.environments.buckets
            .map((environmentBucket) => environmentBucket.key as string)
            .filter(Boolean),
          agentName: topTransactionTypeBucket.sample.top[0].metrics[
            AGENT_NAME
          ] as AgentName,
          avgResponseTime: {
            value: topTransactionTypeBucket.avg_duration.value,
            timeseries: topTransactionTypeBucket.timeseries.buckets.map(
              (dateBucket) => ({
                x: dateBucket.key,
                y: dateBucket.avg_duration.value,
              })
            ),
          },
          transactionErrorRate: {
            value: calculateTransactionErrorPercentage(
              topTransactionTypeBucket.outcomes
            ),
            timeseries: topTransactionTypeBucket.timeseries.buckets.map(
              (dateBucket) => ({
                x: dateBucket.key,
                y: calculateTransactionErrorPercentage(dateBucket.outcomes),
              })
            ),
          },
          transactionsPerMinute: {
            value: calculateThroughput({
              start,
              end,
              value: topTransactionTypeBucket.doc_count,
            }),
            timeseries: topTransactionTypeBucket.timeseries.buckets.map(
              (dateBucket) => ({
                x: dateBucket.key,
                y: calculateThroughput({
                  start,
                  end,
                  value: dateBucket.doc_count,
                }),
              })
            ),
          },
        };
      }) ?? []
    );
  });
}
