/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { isFiniteNumber } from '@kbn/observability-plugin/common/utils/is_finite_number';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_NAME,
} from '../../../common/es_fields/apm';
import { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import { getBucketSizeForAggregatedTransactions } from '../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getDocumentTypeFilterForServiceDestinationStatistics,
  getLatencyFieldForServiceDestinationStatistics,
  getProcessorEventForServiceDestinationStatistics,
} from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import { calculateImpactBuilder } from '../traces/calculate_impact_builder';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const MAX_NUM_OPERATIONS = 500;

export interface DependencyOperation {
  spanName: string;
  latency: number | null;
  throughput: number;
  failureRate: number | null;
  impact: number;
  timeseries: Record<
    'latency' | 'throughput' | 'failureRate',
    Array<{ x: number; y: number | null }>
  >;
}

export async function getTopDependencyOperations({
  apmEventClient,
  dependencyName,
  start,
  end,
  offset,
  environment,
  kuery,
  searchServiceDestinationMetrics,
}: {
  apmEventClient: APMEventClient;
  dependencyName: string;
  start: number;
  end: number;
  offset?: string;
  environment: Environment;
  kuery: string;
  searchServiceDestinationMetrics: boolean;
}): Promise<DependencyOperation[]> {
  const { startWithOffset, endWithOffset, offsetInMs } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start: startWithOffset,
    end: endWithOffset,
    searchAggregatedServiceMetrics: searchServiceDestinationMetrics,
  });

  const field = getLatencyFieldForServiceDestinationStatistics(searchServiceDestinationMetrics);

  const aggs = {
    latency: {
      ...(searchServiceDestinationMetrics
        ? { sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM } }
        : { avg: { field } }),
    },
    count: {
      sum: {
        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
      },
    },
    successful: {
      filter: {
        term: {
          [EVENT_OUTCOME]: EventOutcome.success,
        },
      },
    },
    failure: {
      filter: {
        term: {
          [EVENT_OUTCOME]: EventOutcome.failure,
        },
      },
    },
  };

  const response = await apmEventClient.search('get_top_dependency_operations', {
    apm: {
      events: [getProcessorEventForServiceDestinationStatistics(searchServiceDestinationMetrics)],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, dependencyName),
            ...getDocumentTypeFilterForServiceDestinationStatistics(
              searchServiceDestinationMetrics
            ),
          ],
        },
      },
      aggs: {
        operationName: {
          terms: {
            field: SPAN_NAME,
            size: MAX_NUM_OPERATIONS,
          },
          aggs: {
            over_time: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: {
                  min: startWithOffset,
                  max: endWithOffset,
                },
              },
              aggs,
            },
            ...aggs,
            total_time: {
              sum: { field },
            },
          },
        },
      },
    },
  });

  const getImpact = calculateImpactBuilder(
    response.aggregations?.operationName.buckets.map((bucket) => bucket.total_time.value) ?? []
  );

  return (
    response.aggregations?.operationName.buckets.map((bucket): DependencyOperation => {
      const timeseries: DependencyOperation['timeseries'] = {
        latency: [],
        throughput: [],
        failureRate: [],
      };

      bucket.over_time.buckets.forEach((dateBucket) => {
        const x = dateBucket.key + offsetInMs;
        const latencyValue = isFiniteNumber(dateBucket.latency.value)
          ? dateBucket.latency.value
          : 0;
        const count = isFiniteNumber(dateBucket.count.value) ? dateBucket.count.value : 1;
        timeseries.throughput.push({
          x,
          y: calculateThroughputWithRange({
            start: startWithOffset,
            end: endWithOffset,
            value: searchServiceDestinationMetrics
              ? dateBucket.count.value || 0
              : dateBucket.doc_count,
          }),
        });
        timeseries.latency.push({
          x,
          y: searchServiceDestinationMetrics ? latencyValue / count : dateBucket.latency.value,
        });
        timeseries.failureRate.push({
          x,
          y:
            dateBucket.failure.doc_count > 0 || dateBucket.successful.doc_count > 0
              ? dateBucket.failure.doc_count /
                (dateBucket.successful.doc_count + dateBucket.failure.doc_count)
              : null,
        });
      });

      const latencyValue = isFiniteNumber(bucket.latency.value) ? bucket.latency.value : 0;
      const count = isFiniteNumber(bucket.count.value) ? bucket.count.value : 1;

      return {
        spanName: bucket.key as string,
        latency: searchServiceDestinationMetrics ? latencyValue / count : bucket.latency.value,
        throughput: calculateThroughputWithRange({
          start: startWithOffset,
          end: endWithOffset,
          value: searchServiceDestinationMetrics ? bucket.count.value || 0 : bucket.doc_count,
        }),
        failureRate:
          bucket.failure.doc_count > 0 || bucket.successful.doc_count > 0
            ? bucket.failure.doc_count / (bucket.successful.doc_count + bucket.failure.doc_count)
            : null,
        impact: getImpact(bucket.total_time.value ?? 0),
        timeseries,
      };
    }) ?? []
  );
}
