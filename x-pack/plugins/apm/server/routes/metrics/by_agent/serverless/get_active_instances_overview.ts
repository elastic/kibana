/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  FAAS_BILLED_DURATION,
  FAAS_DURATION,
  FAAS_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { Coordinate } from '../../../../../typings/timeseries';
import { getBucketSize } from '../../../../lib/helpers/get_bucket_size';
import { Setup } from '../../../../lib/helpers/setup_request';

interface ActiveInstanceTimeseries {
  faasDuration: Coordinate[];
  faasBilledDuration: Coordinate[];
  // memoryMax: Coordinate[];
  // memorySize: Coordinate[];
}

interface ActiveInstanceOverview {
  serverlessFunctionName: string;
  timeseries: ActiveInstanceTimeseries;
  faasDuration: number | null;
  faasBilledDuration: number | null;
  // memoryMax: number | null;
  // memorySize: number | null;
}

export async function getServerlessActiveInstancesOverview({
  end,
  environment,
  kuery,
  serviceName,
  setup,
  start,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const { intervalString } = getBucketSize({
    start,
    end,
    numBuckets: 20,
  });

  const aggs = {
    faasDurationAvg: { avg: { field: FAAS_DURATION } },
    faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
    // cgroupMemoryUsedMax: {
    //   max: { script: percentCgroupMemoryUsedScript },
    // },
    // cgroupMemoryUsedAvg: {
    //   avg: { script: percentCgroupMemoryUsedScript },
    // },
    // systemMemoryUsedMax: {
    //   max: { script: percentSystemMemoryUsedScript },
    // },
    // systemMemoryUsedAvg: {
    //   avg: { script: percentSystemMemoryUsedScript },
    // },
  };

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: 1,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        activeInstances: {
          terms: { field: SERVICE_NODE_NAME },
          aggs: {
            serverlessFunctions: {
              terms: { field: FAAS_NAME },
              aggs: {
                ...aggs,
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
                  aggs,
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'ger_serverless_active_instances_overview',
    params
  );

  return (
    response.aggregations?.activeInstances.buckets.map((bucket) => {
      const activeInstanceName = bucket.key_as_string;
      const serverlessFunctionsDetails =
        bucket.serverlessFunctions.buckets.reduce<ActiveInstanceOverview[]>(
          (acc, curr) => {
            const serverlessFunctionName = curr.key_as_string;
            if (!serverlessFunctionName) {
              return acc;
            }

            const timeseries =
              curr.timeseries.buckets.reduce<ActiveInstanceTimeseries>(
                (timeseriesAcc, timeseriesCurr) => {
                  return {
                    faasDuration: [
                      ...timeseriesAcc.faasDuration,
                      {
                        x: timeseriesCurr.key,
                        y: timeseriesCurr.faasDurationAvg.value,
                      },
                    ],
                    faasBilledDuration: [
                      ...timeseriesAcc.faasBilledDuration,
                      {
                        x: timeseriesCurr.key,
                        y: timeseriesCurr.faasBilledDurationAvg.value,
                      },
                    ],
                    // memoryMax: [
                    //   ...timeseriesAcc.memoryMax,
                    //   {
                    //     x: timeseriesCurr.key,
                    //     y:
                    //       timeseriesCurr.cgroupMemoryUsedMax.value ||
                    //       timeseriesCurr.systemMemoryUsedMax.value,
                    //   },
                    // ],
                    // memorySize: [
                    //   ...timeseriesAcc.memorySize,
                    //   {
                    //     x: timeseriesCurr.key,
                    //     y:
                    //       timeseriesCurr.cgroupMemoryUsedAvg.value ||
                    //       timeseriesCurr.systemMemoryUsedAvg.value,
                    //   },
                    // ],
                  };
                },
                {
                  faasDuration: [],
                  faasBilledDuration: [],
                  // memoryMax: [],
                  // memorySize: [],
                }
              );
            return [
              ...acc,
              {
                serverlessFunctionName,
                timeseries,
                faasDuration: curr.faasDurationAvg.value,
                faasBilledDuration: curr.faasBilledDurationAvg.value,
                // memoryMax:
                //   curr.cgroupMemoryUsedMax.value ||
                //   curr.systemMemoryUsedMax.value,
                // memorySize:
                //   curr.cgroupMemoryUsedAvg.value ||
                //   curr.systemMemoryUsedAvg.value,
              },
            ];
          },
          []
        );
      return {
        activeInstanceName,
        ...serverlessFunctionsDetails,
      };
    }) || []
  );
}
