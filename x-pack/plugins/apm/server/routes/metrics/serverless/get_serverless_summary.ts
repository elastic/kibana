/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import {
  FAAS_BILLED_DURATION,
  FAAS_DURATION,
  FAAS_ID,
  HOST_ARCHITECTURE,
  METRICSET_NAME,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { calcEstimatedCost, calcMemoryUsedRate } from './helper';

export type AwsLambdaArchitecture = 'arm' | 'x86_64';

export type AWSLambdaPriceFactor = Record<AwsLambdaArchitecture, number>;

async function getServerlessTransactionThroughput({
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
}) {
  const params = {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(FAAS_ID, serverlessId),
          ],
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_serverless_transaction_throughout',
    params
  );

  return response.hits.total.value;
}

export async function getServerlessSummary({
  end,
  environment,
  kuery,
  serviceName,
  start,
  serverlessId,
  apmEventClient,
  awsLambdaPriceFactor,
  awsLambdaRequestCostPerMillion,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
  apmEventClient: APMEventClient;
  awsLambdaPriceFactor?: AWSLambdaPriceFactor;
  awsLambdaRequestCostPerMillion?: number;
}) {
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
            ...termQuery(FAAS_ID, serverlessId),
          ],
        },
      },
      aggs: {
        totalFunctions: { cardinality: { field: FAAS_ID } },
        faasDurationAvg: { avg: { field: FAAS_DURATION } },
        faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
        avgTotalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
        avgFreeMemory: { avg: { field: METRIC_SYSTEM_FREE_MEMORY } },
        countInvocations: { value_count: { field: FAAS_BILLED_DURATION } },
        sample: {
          top_metrics: {
            metrics: [{ field: HOST_ARCHITECTURE }],
            sort: [{ '@timestamp': { order: 'desc' as const } }],
          },
        },
      },
    },
  };

  const [response, transactionThroughput] = await Promise.all([
    apmEventClient.search('get_serverless_summary', params),
    getServerlessTransactionThroughput({
      end,
      environment,
      kuery,
      serviceName,
      apmEventClient,
      start,
      serverlessId,
    }),
  ]);

  return {
    memoryUsageAvgRate: calcMemoryUsedRate({
      memoryFree: response.aggregations?.avgFreeMemory?.value,
      memoryTotal: response.aggregations?.avgTotalMemory?.value,
    }),
    serverlessFunctionsTotal: response.aggregations?.totalFunctions?.value,
    serverlessDurationAvg: response.aggregations?.faasDurationAvg?.value,
    billedDurationAvg: response.aggregations?.faasBilledDurationAvg?.value,
    estimatedCost: calcEstimatedCost({
      awsLambdaPriceFactor,
      awsLambdaRequestCostPerMillion,
      architecture: response.aggregations?.sample?.top?.[0]?.metrics?.[
        HOST_ARCHITECTURE
      ] as AwsLambdaArchitecture | undefined,
      transactionThroughput,
      billedDuration: response.aggregations?.faasBilledDurationAvg.value,
      totalMemory: response.aggregations?.avgTotalMemory.value,
      countInvocations: response.aggregations?.countInvocations.value,
    }),
  };
}
