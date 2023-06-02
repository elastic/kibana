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
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import {
  getDocCountFieldForServiceDestinationStatistics,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getProcessorEventForServiceDestinationStatistics,
} from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

interface Options {
  dependencyName: string;
  spanName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  searchServiceDestinationMetrics: boolean;
  offset?: string;
}

export interface ThroughputChartsForDependencyResponse {
  currentTimeseries: Array<{ x: number; y: number | null }>;
  comparisonTimeseries: Array<{ x: number; y: number | null }> | null;
}

async function getThroughputChartsForDependencyForTimeRange({
  dependencyName,
  spanName,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  searchServiceDestinationMetrics,
  offset,
}: Options) {
  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    minBucketSize: 60,
  });

  const response = await apmEventClient.search(
    'get_throughput_for_dependency',
    {
      apm: {
        events: [
          getProcessorEventForServiceDestinationStatistics(
            searchServiceDestinationMetrics
          ),
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...rangeQuery(startWithOffset, endWithOffset),
              ...termQuery(SPAN_NAME, spanName || null),
              ...getDocumentTypeFilterForServiceDestinationStatistics(
                searchServiceDestinationMetrics
              ),
              { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } },
            ],
          },
        },
        aggs: {
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: intervalString,
              min_doc_count: 0,
              extended_bounds: { min: startWithOffset, max: endWithOffset },
            },
            aggs: {
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
    }
  );

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key + offsetInMs,
        y: bucket.throughput.value,
      };
    }) ?? []
  );
}

export async function getThroughputChartsForDependency({
  dependencyName,
  spanName,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  searchServiceDestinationMetrics,
  offset,
}: Options): Promise<ThroughputChartsForDependencyResponse> {
  const [currentTimeseries, comparisonTimeseries] = await Promise.all([
    getThroughputChartsForDependencyForTimeRange({
      dependencyName,
      spanName,
      apmEventClient,
      start,
      end,
      kuery,
      environment,
      searchServiceDestinationMetrics,
    }),
    offset
      ? getThroughputChartsForDependencyForTimeRange({
          dependencyName,
          spanName,
          apmEventClient,
          start,
          end,
          kuery,
          environment,
          offset,
          searchServiceDestinationMetrics,
        })
      : null,
  ]);

  return { currentTimeseries, comparisonTimeseries };
}
