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
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeQuery, kqlQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup } from '../../helpers/setup_request';

export async function getServiceErrorGroupDetailedStatistics({
  kuery,
  serviceName,
  setup,
  numBuckets,
  transactionType,
  groupIds,
  environment,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  numBuckets: number;
  transactionType: string;
  groupIds: string[];
  environment: string;
  start: number;
  end: number;
}): Promise<Array<{ groupId: string; timeseries: Coordinate[] }>> {
  const { apmEventClient } = setup;

  const { intervalString } = getBucketSize({ start, end, numBuckets });

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
              { term: { [TRANSACTION_TYPE]: transactionType } },
              ...rangeQuery(start, end),
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
                    min: start,
                    max: end,
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

export async function getServiceErrorGroupPeriods({
  kuery,
  serviceName,
  setup,
  numBuckets,
  transactionType,
  groupIds,
  environment,
  comparisonStart,
  comparisonEnd,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  numBuckets: number;
  transactionType: string;
  groupIds: string[];
  environment: string;
  comparisonStart?: number;
  comparisonEnd?: number;
  start: number;
  end: number;
}) {
  const commonProps = {
    environment,
    kuery,
    serviceName,
    setup,
    numBuckets,
    transactionType,
    groupIds,
  };

  const currentPeriodPromise = getServiceErrorGroupDetailedStatistics({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise =
    comparisonStart && comparisonEnd
      ? getServiceErrorGroupDetailedStatistics({
          ...commonProps,
          start: comparisonStart,
          end: comparisonEnd,
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
