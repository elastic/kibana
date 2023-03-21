/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../../../common/es_fields/apm';
import { getLatencyValue } from '../../lib/helpers/latency_aggregation_type';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';

interface Props {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  field: string;
  fieldNames: string[];
  offset?: string;
}

async function getMobileDetailedStatisticsByField({
  environment,
  kuery,
  serviceName,
  field,
  fieldNames,
  apmEventClient,
  start,
  end,
  offset,
}: Props) {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
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
    `get_mobile_detailed_statistics_by_${field}`,
    {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...termQuery(SERVICE_NAME, serviceName),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          detailed_statistics: {
            terms: {
              field,
              include: fieldNames,
              size: fieldNames.length,
            },
            aggs: {
              timeseries: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: intervalString,
                  min_doc_count: 0,
                  extended_bounds: {
                    min: startWithOffset,
                    max: endWithOffset,
                  },
                },
                aggs: {
                  latency: {
                    avg: {
                      field: TRANSACTION_DURATION,
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

  const buckets = response.aggregations?.detailed_statistics.buckets ?? [];

  return buckets.map((bucket) => {
    const fieldName = bucket.key as string;
    const latency = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: getLatencyValue({
        latencyAggregationType: LatencyAggregationType.avg,
        aggregation: timeseriesBucket.latency,
      }),
    }));
    const throughput = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: timeseriesBucket.doc_count,
    }));

    return {
      fieldName,
      latency,
      throughput,
    };
  });
}

export async function getMobileDetailedStatisticsByFieldPeriods({
  environment,
  kuery,
  serviceName,
  field,
  fieldNames,
  apmEventClient,
  start,
  end,
  offset,
}: Props) {
  const commonProps = {
    environment,
    kuery,
    serviceName,
    field,
    fieldNames,
    apmEventClient,
    start,
    end,
  };

  const currentPeriodPromise = getMobileDetailedStatisticsByField({
    ...commonProps,
  });

  const previousPeriodPromise = offset
    ? getMobileDetailedStatisticsByField({
        ...commonProps,
        offset,
      })
    : [];

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const firstCurrentPeriod = currentPeriod?.[0];
  return {
    currentPeriod: keyBy(currentPeriod, 'fieldName'),
    previousPeriod: keyBy(
      previousPeriod.map((data) => {
        return {
          ...data,
          latency: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firstCurrentPeriod?.latency,
            previousPeriodTimeseries: data.latency,
          }),
          throughput: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firstCurrentPeriod?.throughput,
            previousPeriodTimeseries: data.throughput,
          }),
        };
      }),
      'fieldName'
    ),
  };
}
