/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { withApmSpan } from '../../../../utils/with_apm_span';
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../../common/processor_event';
import { joinByKey } from '../../../../../common/utils/join_by_key';
import {
  environmentQuery,
  rangeQuery,
  kqlQuery,
} from '../../../../../server/utils/queries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

function getHistogramAggOptions({
  bucketSize,
  field,
  distributionMax,
}: {
  bucketSize: number;
  field: string;
  distributionMax: number;
}) {
  return {
    field,
    interval: bucketSize,
    min_doc_count: 0,
    extended_bounds: {
      min: 0,
      max: distributionMax,
    },
  };
}

export async function getBuckets({
  environment,
  kuery,
  serviceName,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  distributionMax,
  bucketSize,
  setup,
  searchAggregatedTransactions,
}: {
  environment?: string;
  kuery?: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  transactionId: string;
  traceId: string;
  distributionMax: number;
  bucketSize: number;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  return withApmSpan(
    'get_latency_distribution_buckets_with_samples',
    async () => {
      const { start, end, apmEventClient } = setup;

      const commonFilters = [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [TRANSACTION_TYPE]: transactionType } },
        { term: { [TRANSACTION_NAME]: transactionName } },
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...kqlQuery(kuery),
      ] as QueryDslQueryContainer[];

      async function getSamplesForDistributionBuckets() {
        const response = await apmEventClient.search(
          'get_samples_for_latency_distribution_buckets',
          {
            apm: {
              events: [ProcessorEvent.transaction],
            },
            body: {
              query: {
                bool: {
                  filter: [
                    ...commonFilters,
                    { term: { [TRANSACTION_SAMPLED]: true } },
                  ],
                  should: [
                    { term: { [TRACE_ID]: traceId } },
                    { term: { [TRANSACTION_ID]: transactionId } },
                  ] as QueryDslQueryContainer[],
                },
              },
              aggs: {
                distribution: {
                  histogram: getHistogramAggOptions({
                    bucketSize,
                    field: TRANSACTION_DURATION,
                    distributionMax,
                  }),
                  aggs: {
                    samples: {
                      top_hits: {
                        _source: [TRANSACTION_ID, TRACE_ID],
                        size: 10,
                        sort: {
                          _score: 'desc' as const,
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
          response.aggregations?.distribution.buckets.map((bucket) => {
            const samples = bucket.samples.hits.hits;
            return {
              key: bucket.key,
              samples: samples.map(({ _source: sample }) => ({
                traceId: sample.trace.id,
                transactionId: sample.transaction.id,
              })),
            };
          }) ?? []
        );
      }

      async function getDistributionBuckets() {
        const response = await apmEventClient.search(
          'get_latency_distribution_buckets',
          {
            apm: {
              events: [
                getProcessorEventForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
              ],
            },
            body: {
              query: {
                bool: {
                  filter: [
                    ...commonFilters,
                    ...getDocumentTypeFilterForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  ],
                },
              },
              aggs: {
                distribution: {
                  histogram: getHistogramAggOptions({
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                    bucketSize,
                    distributionMax,
                  }),
                },
              },
            },
          }
        );

        return (
          response.aggregations?.distribution.buckets.map((bucket) => {
            return {
              key: bucket.key,
              count: bucket.doc_count,
            };
          }) ?? []
        );
      }

      const [
        samplesForDistributionBuckets,
        distributionBuckets,
      ] = await Promise.all([
        getSamplesForDistributionBuckets(),
        getDistributionBuckets(),
      ]);

      const buckets = joinByKey(
        [...samplesForDistributionBuckets, ...distributionBuckets],
        'key'
      ).map((bucket) => ({
        ...bucket,
        samples: bucket.samples ?? [],
        count: bucket.count ?? 0,
      }));

      return {
        noHits: buckets.length === 0,
        bucketSize,
        buckets,
      };
    }
  );
}
