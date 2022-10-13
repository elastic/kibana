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
import { getMemoryInfo } from '../shared/memory';

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
            // systemMemoryUsedMax: {
            //   max: { script: percentMemoryUsedScript },
            // },
            // systemMemoryUsedAvg: {
            //   avg: { script: percentMemoryUsedScript },
            // },
          },
        },
      },
    },
  };

  getMemoryInfo({ end, environment, kuery, serviceName, setup, start });

  const response = await apmEventClient.search(
    'ger_serverless_functions_overview',
    params
  );

  const serverlessFunctionsOverview =
    response.aggregations?.serverlessFunctions.buckets.map((bucket) => {
      return {
        serverlessFunctionName: bucket.key,
        serverlessDurationAvg: bucket.faasDurationAvg.value,
        billedDurationAvg: bucket.faasBilledDurationAvg.value,
        coldStartCount: bucket.coldStartCount.value,
        memoryMax: 0, // bucket.systemMemoryUsedMax.value,
        memorySize: 0, // bucket.systemMemoryUsedAvg.value,
      };
    });

  return serverlessFunctionsOverview || [];
}
