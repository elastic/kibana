/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '../../../../../common/features/alerts_and_slos';
import { kqlQuery, rangeQuery, termQuery } from '../../../alerts_and_slos/utils/queries';
import {
  FAAS_BILLED_DURATION,
  FAAS_COLDSTART,
  FAAS_DURATION,
  FAAS_ID,
  METRICSET_NAME,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../../../../common/features/apm/es_fields/apm';
import { getServerlessFunctionNameFromId } from '../../../../../../common/features/apm/serverless';
import { environmentQuery } from '../../../../../../common/features/apm/utils/environment_query';
import { calcMemoryUsed } from './helper';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export type ServerlessFunctionsOverviewResponse = Array<{
  serverlessId: string;
  serverlessFunctionName: string;
  serverlessDurationAvg: number | null;
  billedDurationAvg: number | null;
  coldStartCount: number | null;
  avgMemoryUsed: number | undefined;
  memorySize: number | null;
}>;

export async function getServerlessFunctionsOverview({
  end,
  environment,
  kuery,
  serviceName,
  start,
  apmEventClient,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  start: number;
  end: number;
  apmEventClient: APMEventClient;
}): Promise<ServerlessFunctionsOverviewResponse> {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(METRICSET_NAME, 'app'),
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        serverlessFunctions: {
          terms: { field: FAAS_ID },
          aggs: {
            faasDurationAvg: { avg: { field: FAAS_DURATION } },
            faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
            coldStartCount: { sum: { field: FAAS_COLDSTART } },
            maxTotalMemory: { max: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
            avgTotalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
            avgFreeMemory: { avg: { field: METRIC_SYSTEM_FREE_MEMORY } },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('ger_serverless_functions_overview', params);

  const serverlessFunctionsOverview = response.aggregations?.serverlessFunctions?.buckets?.map(
    (bucket) => {
      const serverlessId = bucket.key as string;
      return {
        serverlessId,
        serverlessFunctionName: getServerlessFunctionNameFromId(serverlessId),
        serverlessDurationAvg: bucket.faasDurationAvg.value,
        billedDurationAvg: bucket.faasBilledDurationAvg.value,
        coldStartCount: bucket.coldStartCount.value,
        avgMemoryUsed: calcMemoryUsed({
          memoryFree: bucket.avgFreeMemory.value,
          memoryTotal: bucket.avgTotalMemory.value,
        }),
        memorySize: bucket.maxTotalMemory.value,
      };
    }
  );

  return serverlessFunctionsOverview || [];
}
