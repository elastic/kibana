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
  FAAS_COLDSTART,
  FAAS_DURATION,
  FAAS_NAME,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { Setup } from '../../../../lib/helpers/setup_request';

export async function getServerlessFunctionsOverview({
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
        serverlessFunctions: {
          terms: { field: FAAS_NAME },
          aggs: {
            faasDurationAvg: { avg: { field: FAAS_DURATION } },
            faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
            coldStartCount: { sum: { field: FAAS_COLDSTART } },
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
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'ger_serverless_functions_overview',
    params
  );

  const serverlessFunctionsOverview =
    response.aggregations?.serverlessFunctions.buckets.map((bucket) => {
      return {
        functionName: bucket.key,
        serverlessDurationAvg: bucket.faasDurationAvg.value,
        billedDurationAvg: bucket.faasBilledDurationAvg.value,
        coldStartCount: bucket.coldStartCount.value,
        // memoryMax:
        //   bucket.cgroupMemoryUsedMax.value || bucket.systemMemoryUsedMax.value,
        // memorySize:
        //   bucket.cgroupMemoryUsedAvg.value || bucket.systemMemoryUsedAvg.value,
      };
    });

  return serverlessFunctionsOverview || [];
}
