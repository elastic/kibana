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
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Setup } from '../../lib/helpers/setup_request';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';
import {
  getDocCountFieldForServiceDestinationStatistics,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getProcessorEventForServiceDestinationStatistics,
} from '../../lib/helpers/spans/get_is_using_service_destination_metrics';

export async function getThroughputChartsForBackend({
  backendName,
  spanName,
  setup,
  start,
  end,
  environment,
  kuery,
  searchServiceDestinationMetrics,
  offset,
}: {
  backendName: string;
  spanName: string;
  setup: Setup;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  searchServiceDestinationMetrics: boolean;
  offset?: string;
}) {
  const { apmEventClient } = setup;

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

  const response = await apmEventClient.search('get_throughput_for_backend', {
    apm: {
      events: [
        getProcessorEventForServiceDestinationStatistics(
          searchServiceDestinationMetrics
        ),
      ],
    },
    body: {
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
            { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
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
  });

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key + offsetInMs,
        y: bucket.throughput.value,
      };
    }) ?? []
  );
}
