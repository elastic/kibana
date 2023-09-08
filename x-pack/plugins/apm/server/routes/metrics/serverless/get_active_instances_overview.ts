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
import {
  FAAS_BILLED_DURATION,
  FAAS_DURATION,
  FAAS_ID,
  METRICSET_NAME,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../common/es_fields/apm';
import { getServerlessFunctionNameFromId } from '../../../../common/serverless';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Coordinate } from '../../../../typings/timeseries';
import { getBucketSize } from '../../../../common/utils/get_bucket_size';
import { calcMemoryUsed } from './helper';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

interface ActiveInstanceTimeseries {
  serverlessDuration: Coordinate[];
  billedDuration: Coordinate[];
}

export interface ActiveInstanceOverview {
  activeInstanceName: string;
  serverlessId: string;
  serverlessFunctionName: string;
  timeseries: ActiveInstanceTimeseries;
  serverlessDurationAvg: number | null;
  billedDurationAvg: number | null;
  avgMemoryUsed?: number | null;
  memorySize: number | null;
}

export async function getServerlessActiveInstancesOverview({
  end,
  environment,
  kuery,
  serviceName,
  start,
  serverlessId,
  apmEventClient,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
  apmEventClient: APMEventClient;
}): Promise<ActiveInstanceOverview[]> {
  const { intervalString } = getBucketSize({
    start,
    end,
    numBuckets: 20,
  });

  const aggs = {
    faasDurationAvg: { avg: { field: FAAS_DURATION } },
    faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
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
            ...termQuery(METRICSET_NAME, 'app'),
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(FAAS_ID, serverlessId),
          ],
        },
      },
      aggs: {
        activeInstances: {
          terms: { field: SERVICE_NODE_NAME },
          aggs: {
            serverlessFunctions: {
              terms: { field: FAAS_ID },
              aggs: {
                ...{
                  ...aggs,
                  maxTotalMemory: {
                    max: { field: METRIC_SYSTEM_TOTAL_MEMORY },
                  },
                  avgTotalMemory: {
                    avg: { field: METRIC_SYSTEM_TOTAL_MEMORY },
                  },
                  avgFreeMemory: { avg: { field: METRIC_SYSTEM_FREE_MEMORY } },
                },
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
    response.aggregations?.activeInstances?.buckets?.flatMap((bucket) => {
      const activeInstanceName = bucket.key as string;
      const serverlessFunctionsDetails =
        bucket.serverlessFunctions.buckets.reduce<ActiveInstanceOverview[]>(
          (acc, curr) => {
            const currentServerlessId = curr.key as string;

            const timeseries =
              curr.timeseries.buckets.reduce<ActiveInstanceTimeseries>(
                (timeseriesAcc, timeseriesCurr) => {
                  return {
                    serverlessDuration: [
                      ...timeseriesAcc.serverlessDuration,
                      {
                        x: timeseriesCurr.key,
                        y: timeseriesCurr.faasDurationAvg.value,
                      },
                    ],
                    billedDuration: [
                      ...timeseriesAcc.billedDuration,
                      {
                        x: timeseriesCurr.key,
                        y: timeseriesCurr.faasBilledDurationAvg.value,
                      },
                    ],
                  };
                },
                {
                  serverlessDuration: [],
                  billedDuration: [],
                }
              );
            return [
              ...acc,
              {
                activeInstanceName,
                serverlessId: currentServerlessId,
                serverlessFunctionName:
                  getServerlessFunctionNameFromId(currentServerlessId),
                timeseries,
                serverlessDurationAvg: curr.faasDurationAvg.value,
                billedDurationAvg: curr.faasBilledDurationAvg.value,
                avgMemoryUsed: calcMemoryUsed({
                  memoryFree: curr.avgFreeMemory.value,
                  memoryTotal: curr.avgTotalMemory.value,
                }),
                memorySize: curr.avgTotalMemory.value,
              },
            ];
          },
          []
        );
      return serverlessFunctionsDetails;
    }) || []
  );
}
