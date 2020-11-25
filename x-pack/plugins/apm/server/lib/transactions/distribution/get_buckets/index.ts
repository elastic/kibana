/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
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
import { rangeFilter } from '../../../../../common/utils/range_filter';
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
  const { start, end, esFilter, apmEventClient } = setup;

  const commonFilters = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    { term: { [TRANSACTION_NAME]: transactionName } },
    { range: rangeFilter(start, end) },
    ...esFilter,
  ];

  async function getSamplesForDistributionBuckets() {
    const response = await apmEventClient.search({
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
            ],
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
                    _score: 'desc',
                  },
                },
              },
            },
          },
        },
      },
    });

    return (
      response.aggregations?.distribution.buckets.map((bucket) => {
        return {
          key: bucket.key,
          samples: bucket.samples.hits.hits.map((hit) => ({
            traceId: hit._source.trace.id,
            transactionId: hit._source.transaction.id,
          })),
        };
      }) ?? []
    );
  }

  async function getDistributionBuckets() {
    const response = await apmEventClient.search({
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
    });

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

export type DistributionBucket = ValuesType<
  PromiseReturnType<typeof getBuckets>['buckets']
>;
