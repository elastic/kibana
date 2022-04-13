/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { Coordinate } from '../../../../typings/timeseries';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeQuery, kqlQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getBucketSize } from '../../../lib/helpers/get_bucket_size';
import { Setup } from '../../../lib/helpers/setup_request';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';

export async function getErrorGroupDetailedStatistics({
  kuery,
  serviceName,
  setup,
  numBuckets,
  groupIds,
  environment,
  start,
  end,
  offset,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  numBuckets: number;
  groupIds: string[];
  environment: string;
  start: number;
  end: number;
  offset?: string;
}): Promise<Array<{ groupId: string; timeseries: Coordinate[] }>> {
  const { apmEventClient } = setup;

  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    numBuckets,
  });

  const timeseriesResponse = await apmEventClient.search(
    'get_service_error_group_detailed_statistics',
    {
      apm: {
        events: [ProcessorEvent.error],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { [ERROR_GROUP_ID]: groupIds } },
              { term: { [SERVICE_NAME]: serviceName } },
              ...rangeQuery(startWithOffset, endWithOffset),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          error_groups: {
            terms: {
              field: ERROR_GROUP_ID,
              size: 500,
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
              },
            },
          },
        },
      },
    }
  );

  if (!timeseriesResponse.aggregations) {
    return [];
  }

  return timeseriesResponse.aggregations.error_groups.buckets.map((bucket) => {
    const groupId = bucket.key as string;
    return {
      groupId,
      timeseries: bucket.timeseries.buckets.map((timeseriesBucket) => {
        return {
          x: timeseriesBucket.key,
          y: timeseriesBucket.doc_count,
        };
      }),
    };
  });
}

export async function getErrorGroupPeriods({
  kuery,
  serviceName,
  setup,
  numBuckets,
  groupIds,
  environment,
  start,
  end,
  offset,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  numBuckets: number;
  groupIds: string[];
  environment: string;
  start: number;
  end: number;
  offset?: string;
}) {
  const commonProps = {
    environment,
    kuery,
    serviceName,
    setup,
    numBuckets,
    groupIds,
  };

  const currentPeriodPromise = getErrorGroupDetailedStatistics({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise = offset
    ? getErrorGroupDetailedStatistics({
        ...commonProps,
        start,
        end,
        offset,
      })
    : [];

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const firstCurrentPeriod = currentPeriod?.[0];

  return {
    currentPeriod: keyBy(currentPeriod, 'groupId'),
    previousPeriod: keyBy(
      previousPeriod.map((errorRateGroup) => ({
        ...errorRateGroup,
        timeseries: offsetPreviousPeriodCoordinates({
          currentPeriodTimeseries: firstCurrentPeriod?.timeseries,
          previousPeriodTimeseries: errorRateGroup.timeseries,
        }),
      })),
      'groupId'
    ),
  };
}
