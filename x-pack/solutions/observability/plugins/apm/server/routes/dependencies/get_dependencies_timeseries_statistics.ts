/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { EVENT_OUTCOME, SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import {
  getDocCountFieldForServiceDestinationStatistics,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getLatencyFieldForServiceDestinationStatistics,
  getProcessorEventForServiceDestinationStatistics,
} from '../../lib/helpers/spans/get_is_using_service_destination_metrics';

interface Options {
  dependencyNames: string[];
  searchServiceDestinationMetrics: boolean;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  offset?: string;
  numBuckets: number;
}

interface Statistics {
  latency: Array<{ x: number; y: number }>;
  errorRate: Array<{ x: number; y: number }>;
  throughput: Array<{ x: number; y: number | null }>;
}

async function fetchDependenciesTimeseriesStatistics({
  dependencyNames,
  searchServiceDestinationMetrics,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  numBuckets,
}: Options) {
  const response = await apmEventClient.search('get_latency_for_dependency', {
    apm: {
      events: [getProcessorEventForServiceDestinationStatistics(searchServiceDestinationMetrics)],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...environmentQuery(environment),
          ...kqlQuery(kuery),
          ...rangeQuery(start, end),
          ...getDocumentTypeFilterForServiceDestinationStatistics(searchServiceDestinationMetrics),
          { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyNames } },
        ],
      },
    },
    aggs: {
      dependencies: {
        terms: {
          field: SPAN_DESTINATION_SERVICE_RESOURCE,
          size: dependencyNames.length,
        },
        aggs: {
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: getBucketSize({
                start,
                end,
                numBuckets,
                minBucketSize: 60,
              }).intervalString,
              extended_bounds: {
                min: start,
                max: end,
              },
            },
            aggs: {
              // latency
              latency_sum: {
                sum: {
                  field: getLatencyFieldForServiceDestinationStatistics(
                    searchServiceDestinationMetrics
                  ),
                },
              },
              ...(searchServiceDestinationMetrics
                ? {
                    latency_count: {
                      sum: {
                        field: getDocCountFieldForServiceDestinationStatistics(
                          searchServiceDestinationMetrics
                        ),
                      },
                    },
                  }
                : {}),
              // error
              ...(searchServiceDestinationMetrics
                ? {
                    total_count: {
                      sum: {
                        field: getDocCountFieldForServiceDestinationStatistics(
                          searchServiceDestinationMetrics
                        ),
                      },
                    },
                  }
                : {}),
              failures: {
                filter: {
                  term: {
                    [EVENT_OUTCOME]: EventOutcome.failure,
                  },
                },
                aggs: {
                  ...(searchServiceDestinationMetrics
                    ? {
                        total_count: {
                          sum: {
                            field: getDocCountFieldForServiceDestinationStatistics(
                              searchServiceDestinationMetrics
                            ),
                          },
                        },
                      }
                    : {}),
                },
              },
              // throughput
              throughput: {
                rate: {
                  ...(searchServiceDestinationMetrics
                    ? {
                        field: getDocCountFieldForServiceDestinationStatistics(
                          searchServiceDestinationMetrics
                        ),
                      }
                    : {}),
                  unit: 'minute',
                },
              },
            },
          },
        },
      },
    },
  });

  return response.aggregations?.dependencies.buckets || [];
}

export type DependenciesTimeseriesBuckes = Awaited<
  ReturnType<typeof fetchDependenciesTimeseriesStatistics>
>;

export function parseDependenciesStats({
  dependencies,
  offsetInMs,
}: {
  dependencies: DependenciesTimeseriesBuckes;
  offsetInMs: number;
}) {
  return (
    dependencies.reduce<Record<string, Statistics>>((acc, bucket) => {
      const stats: Statistics = {
        latency: [],
        errorRate: [],
        throughput: [],
      };

      for (const statsBucket of bucket.timeseries.buckets) {
        const totalCount = statsBucket.total_count?.value ?? statsBucket.doc_count;
        const failureCount =
          statsBucket.failures.total_count?.value ?? statsBucket.failures.doc_count;
        const x = statsBucket.key + offsetInMs;

        stats.latency.push({
          x,
          y:
            (statsBucket.latency_sum.value ?? 0) /
            (statsBucket.latency_count?.value ?? statsBucket.doc_count),
        });
        stats.errorRate.push({ x, y: failureCount / totalCount });
        stats.throughput.push({ x, y: statsBucket.throughput.value });
      }

      acc[bucket.key] = stats;
      return acc;
    }, {}) ?? {}
  );
}

export interface DependenciesTimeseriesStatisticsResponse {
  currentTimeseries: Record<string, Statistics>;
  comparisonTimeseries: Record<string, Statistics> | null;
}

export async function getDependenciesTimeseriesStatistics({
  apmEventClient,
  dependencyNames,
  start,
  end,
  environment,
  kuery,
  searchServiceDestinationMetrics,
  offset,
  numBuckets,
}: Options): Promise<DependenciesTimeseriesStatisticsResponse> {
  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const [currentTimeseries, comparisonTimeseries] = await Promise.all([
    fetchDependenciesTimeseriesStatistics({
      dependencyNames,
      searchServiceDestinationMetrics,
      apmEventClient,
      start,
      end,
      kuery,
      environment,
      numBuckets,
    }),
    offset
      ? fetchDependenciesTimeseriesStatistics({
          dependencyNames,
          searchServiceDestinationMetrics,
          apmEventClient,
          start: startWithOffset,
          end: endWithOffset,
          kuery,
          environment,
          numBuckets,
        })
      : null,
  ]);

  return {
    currentTimeseries: parseDependenciesStats({ dependencies: currentTimeseries, offsetInMs: 0 }),
    comparisonTimeseries: comparisonTimeseries?.length
      ? parseDependenciesStats({ dependencies: comparisonTimeseries, offsetInMs })
      : null,
  };
}
