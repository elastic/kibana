/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../../observability/typings/common';
import { EventOutcome } from '../../../../common/event_outcome';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';

import { ESFilter } from '../../../../../../typings/elasticsearch';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { getBucketSize } from '../../helpers/get_bucket_size';

export type TransactionGroupTimeseriesData = PromiseReturnType<
  typeof getTimeseriesDataForTransactionGroups
>;

export async function getTimeseriesDataForTransactionGroups({
  apmEventClient,
  start,
  end,
  serviceName,
  transactionNames,
  esFilter,
  searchAggregatedTransactions,
  size,
  numBuckets,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceName: string;
  transactionNames: string[];
  esFilter: ESFilter[];
  searchAggregatedTransactions: boolean;
  size: number;
  numBuckets: number;
}) {
  const { intervalString } = getBucketSize({ start, end, numBuckets });

  const timeseriesResponse = await apmEventClient.search({
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
            { terms: { [TRANSACTION_NAME]: transactionNames } },
            { term: { [SERVICE_NAME]: serviceName } },
            { range: rangeFilter(start, end) },
            ...esFilter,
          ],
        },
      },
      aggs: {
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            size,
          },
          aggs: {
            transaction_types: {
              terms: {
                field: TRANSACTION_TYPE,
              },
            },
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: {
                  min: start,
                  max: end,
                },
              },
              aggs: {
                avg_latency: {
                  avg: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
                transaction_count: {
                  value_count: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
                [EVENT_OUTCOME]: {
                  filter: {
                    term: {
                      [EVENT_OUTCOME]: EventOutcome.failure,
                    },
                  },
                  aggs: {
                    transaction_count: {
                      value_count: {
                        field: getTransactionDurationFieldForAggregatedTransactions(
                          searchAggregatedTransactions
                        ),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return timeseriesResponse.aggregations?.transaction_groups.buckets ?? [];
}
