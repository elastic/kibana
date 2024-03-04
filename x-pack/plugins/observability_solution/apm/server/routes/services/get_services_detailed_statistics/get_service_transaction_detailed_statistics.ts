/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { isDefaultTransactionType } from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { calculateThroughputWithInterval } from '../../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { withApmSpan } from '../../../utils/with_apm_span';
import { maybe } from '../../../../common/utils/maybe';

interface ServiceTransactionDetailedStat {
  serviceName: string;
  latency: Array<{ x: number; y: number | null }>;
  transactionErrorRate?: Array<{ x: number; y: number }>;
  throughput?: Array<{ x: number; y: number }>;
}

export async function getServiceTransactionDetailedStats({
  serviceNames,
  environment,
  kuery,
  apmEventClient,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const outcomes = getOutcomeAggregation(documentType);

  const metrics = {
    avg_duration: {
      avg: {
        field: getDurationFieldForTransactions(documentType),
      },
    },
    ...outcomes,
  };

  const response = await apmEventClient.search(
    'get_service_transaction_detail_stats',
    {
      apm: {
        sources: [
          {
            documentType,
            rollupInterval,
          },
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { [SERVICE_NAME]: serviceNames } },
              ...rangeQuery(startWithOffset, endWithOffset),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
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
                  size: serviceNames.length,
                },
                aggs: {
                  transactionType: {
                    terms: {
                      field: TRANSACTION_TYPE,
                    },
                    aggs: {
                      ...metrics,
                      timeseries: {
                        date_histogram: {
                          field: '@timestamp',
                          fixed_interval: `${bucketSizeInSeconds}s`,
                          min_doc_count: 0,
                          extended_bounds: {
                            min: startWithOffset,
                            max: endWithOffset,
                          },
                        },
                        aggs: metrics,
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

  return keyBy(
    response.aggregations?.sample.services.buckets.map((bucket) => {
      const topTransactionTypeBucket = maybe(
        bucket.transactionType.buckets.find(({ key }) =>
          isDefaultTransactionType(key as string)
        ) ?? bucket.transactionType.buckets[0]
      );

      return {
        serviceName: bucket.key as string,
        latency:
          topTransactionTypeBucket?.timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key + offsetInMs,
            y: dateBucket.avg_duration.value,
          })) ?? [],
        transactionErrorRate:
          topTransactionTypeBucket?.timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key + offsetInMs,
            y: calculateFailedTransactionRate(dateBucket),
          })) ?? undefined,
        throughput: topTransactionTypeBucket?.timeseries.buckets.map(
          (dateBucket) => ({
            x: dateBucket.key + offsetInMs,
            y: calculateThroughputWithInterval({
              bucketSize: bucketSizeInSeconds,
              value: dateBucket.doc_count,
            }),
          })
        ),
      };
    }) ?? [],
    'serviceName'
  );
}

export interface ServiceTransactionDetailedStatPeriodsResponse {
  currentPeriod: Record<string, ServiceTransactionDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionDetailedStat>;
}

export async function getServiceTransactionDetailedStatsPeriods({
  serviceNames,
  environment,
  kuery,
  apmEventClient,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}): Promise<ServiceTransactionDetailedStatPeriodsResponse> {
  return withApmSpan('get_service_detailed_statistics', async () => {
    const commonProps = {
      serviceNames,
      environment,
      kuery,
      apmEventClient,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
      start,
      end,
      randomSampler,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceTransactionDetailedStats(commonProps),
      offset
        ? getServiceTransactionDetailedStats({
            ...commonProps,
            offset,
          })
        : Promise.resolve({}),
    ]);

    return { currentPeriod, previousPeriod };
  });
}
