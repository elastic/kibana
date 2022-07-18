/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import {
  calculateThroughputWithInterval,
  calculateThroughputWithRange,
} from '../../lib/helpers/calculate_throughput';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { Setup } from '../../lib/helpers/setup_request';
import { calculateImpactBuilder } from '../traces/calculate_impact_builder';

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
  setup,
  dependencyName,
  start,
  end,
  offset,
  environment,
  kuery,
}: {
  setup: Setup;
  dependencyName: string;
  start: number;
  end: number;
  offset?: string;
  environment: Environment;
  kuery: string;
}) {
  const { apmEventClient } = setup;

  const { startWithOffset, endWithOffset, offsetInMs } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const aggs = {
    duration: {
      avg: {
        field: SPAN_DURATION,
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

  const response = await apmEventClient.search(
    'get_top_dependency_operations',
    {
      apm: {
        events: [ProcessorEvent.span],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(startWithOffset, endWithOffset),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, dependencyName),
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
                date_histogram: getMetricsDateHistogramParams({
                  start: startWithOffset,
                  end: endWithOffset,
                  metricsInterval: 60,
                }),
                aggs,
              },
              ...aggs,
              total_time: {
                sum: {
                  field: SPAN_DURATION,
                },
              },
            },
          },
        },
      },
    }
  );

  const getImpact = calculateImpactBuilder(
    response.aggregations?.operationName.buckets.map(
      (bucket) => bucket.total_time.value
    ) ?? []
  );

  return (
    response.aggregations?.operationName.buckets.map(
      (bucket): DependencyOperation => {
        const timeseries: DependencyOperation['timeseries'] = {
          latency: [],
          throughput: [],
          failureRate: [],
        };

        bucket.over_time.buckets.forEach((dateBucket) => {
          const x = dateBucket.key + offsetInMs;
          timeseries.throughput.push({
            x,
            y: calculateThroughputWithInterval({
              value: dateBucket.doc_count,
              bucketSize: 60,
            }),
          });
          timeseries.latency.push({ x, y: dateBucket.duration.value });
          timeseries.failureRate.push({
            x,
            y:
              dateBucket.failure.doc_count > 0 ||
              dateBucket.successful.doc_count > 0
                ? dateBucket.failure.doc_count /
                  (dateBucket.successful.doc_count +
                    dateBucket.failure.doc_count)
                : null,
          });
        });

        return {
          spanName: bucket.key as string,
          latency: bucket.duration.value,
          throughput: calculateThroughputWithRange({
            start: startWithOffset,
            end: endWithOffset,
            value: bucket.doc_count,
          }),
          failureRate:
            bucket.failure.doc_count > 0 || bucket.successful.doc_count > 0
              ? bucket.failure.doc_count /
                (bucket.successful.doc_count + bucket.failure.doc_count)
              : null,
          impact: getImpact(bucket.total_time.value ?? 0),
          timeseries,
        };
      }
    ) ?? []
  );
}
