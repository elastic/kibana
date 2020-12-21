/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { EventOutcome } from '../../../../common/event_outcome';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { ServicesItemsSetup } from './get_services_items';

interface AggregationParams {
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
}

const MAX_NUMBER_OF_SERVICES = 500;

export async function getServiceTransactionStats({
  setup,
  searchAggregatedTransactions,
}: AggregationParams) {
  const { apmEventClient, start, end, esFilter } = setup;

  const count = {
    value_count: {
      field: getTransactionDurationFieldForAggregatedTransactions(
        searchAggregatedTransactions
      ),
    },
  };

  const metrics = {
    count,
    avg_duration: {
      avg: {
        field: getTransactionDurationFieldForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      },
    },
    failure: {
      filter: { term: { [EVENT_OUTCOME]: EventOutcome.failure } },
      aggs: { count },
    },
    successful: {
      filter: { term: { [EVENT_OUTCOME]: EventOutcome.success } },
      aggs: { count },
    },
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
            { range: rangeFilter(start, end) },
            ...esFilter,
            ...getDocumentTypeFilterForAggregatedTransactions(
              searchAggregatedTransactions
            ),
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
              terms: { field: TRANSACTION_TYPE },
              aggs: {
                ...metrics,
                environments: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                    missing: '',
                  },
                },
                agentName: {
                  top_hits: {
                    docvalue_fields: [AGENT_NAME] as const,
                    size: 1,
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

  const deltaAsMinutes = (setup.end - setup.start) / 1000 / 60;

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
        agentName: topTransactionTypeBucket.agentName.hits.hits[0].fields[
          'agent.name'
        ]?.[0] as AgentName,
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
          value:
            topTransactionTypeBucket.failure.count.value /
            (topTransactionTypeBucket.failure.count.value +
              topTransactionTypeBucket.successful.count.value),
          timeseries: topTransactionTypeBucket.timeseries.buckets.map(
            (dateBucket) => ({
              x: dateBucket.key,
              y:
                dateBucket.failure.count.value /
                (dateBucket.failure.count.value +
                  dateBucket.successful.count.value),
            })
          ),
        },
        transactionsPerMinute: {
          value: topTransactionTypeBucket.count.value / deltaAsMinutes,
          timeseries: topTransactionTypeBucket.timeseries.buckets.map(
            (dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.avg_duration.value,
            })
          ),
        },
      };
    }) ?? []
  );
}
