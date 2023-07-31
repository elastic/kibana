import { Coordinate } from '@kbn/apm-plugin/typings/timeseries';
import { Maybe } from '@kbn/apm-plugin/typings/common';
import { APMEventClient } from '@kbn/apm-plugin/server/lib/helpers/create_es_client/create_apm_event_client';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  ERROR_TYPE,
  ERROR_ID
} from '@kbn/apm-plugin/common/es_fields/apm';
import { environmentQuery } from '@kbn/apm-plugin/common/utils/environment_query';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';

export interface CrashRateTimeseries {
  currentPeriod: { timeseries: Coordinate[]; value: Maybe<number> };
  previousPeriod: { timeseries: Coordinate[]; value: Maybe<number> };
}

interface Props {
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionName?: string;
  environment: string;
  start: number;
  end: number;
  kuery: string;
  offset?: string;
}

async function getMobileCrashTimeseries({
                                           apmEventClient,
                                           serviceName,
                                           transactionName,
                                           environment,
                                           start,
                                           end,
                                           kuery,
                                           offset,
                                         }: Props){
  const { startWithOffset, endWithOffset } = getOffsetInMs( {
    start,
    end,
    offset,
  });

  const { intervalString} = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    minBucketSize: 60,
  });

  const aggs = {
  crashes: {
     cardinality: { field: ERROR_ID }
   },
  };

  const response = await apmEventClient.search('get_mobile_crash_rate', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(ERROR_TYPE, "crash"),
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
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
          aggs,
        },
        ...aggs,
      },
    },
  });

  const timeseries =
    response?.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key,
        y: bucket.crashes.value
      };
    }) ?? [];

  return {
    timeseries,
    value: response.aggregations?.crashes?.value
  };
}

export async function getMobileCrashRate({
                                           kuery,
                                           apmEventClient,
                                           serviceName,
                                           transactionName,
                                           environment,
                                           start,
                                           end,
                                           offset,
                                         }:Props): Promise<CrashRateTimeseries> {
  const options = {
    serviceName,
    transactionName,
    apmEventClient,
    kuery,
    environment,
  };

  const currentPeriodPromise = getMobileCrashTimeseries({
    ...options,
    start,
    end,
  });

  const previousPeriodPromise = offset ? getMobileCrashTimeseries({
    ...options,
    start,
    end,
    offset,
  })
    : {timeseries: [], value: null };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);
  return {
    currentPeriod,
    previousPeriod: {
      timeseries: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries: currentPeriod.timeseries,
        previousPeriodTimeseries: previousPeriod.timeseries,
      }),
      value: previousPeriod?.value,
    },
  };
}

