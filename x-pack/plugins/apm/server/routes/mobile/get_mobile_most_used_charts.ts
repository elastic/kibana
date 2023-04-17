/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  DEVICE_MODEL_IDENTIFIER,
  HOST_OS_VERSION,
  NETWORK_CONNECTION_TYPE,
  SERVICE_NAME,
  SERVICE_VERSION,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

type MobileMostUsedChartTypes =
  | 'device'
  | 'appVersion'
  | 'osVersion'
  | 'netConnectionType';

export type MobileMostUsedChartResponse = Array<{
  key: MobileMostUsedChartTypes;
  options: Array<{
    key: string | number;
    percentage: string;
    docCount: number;
  }>;
}>;

export async function getMobileMostUsedCharts({
  kuery,
  apmEventClient,
  serviceName,
  transactionType,
  environment,
  start,
  end,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType?: string;
  environment: string;
  start: number;
  end: number;
}): Promise<MobileMostUsedChartResponse> {
  const MAX_ITEMS_PER_CHART = 5;
  const response = await apmEventClient.search('get_mobile_most_used_charts', {
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
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        devices: {
          terms: {
            field: DEVICE_MODEL_IDENTIFIER,
            size: MAX_ITEMS_PER_CHART,
          },
        },
        osVersions: {
          terms: {
            field: HOST_OS_VERSION,
            size: MAX_ITEMS_PER_CHART,
          },
        },
        appVersions: {
          terms: {
            field: SERVICE_VERSION,
            size: MAX_ITEMS_PER_CHART,
          },
        },
        netConnectionTypes: {
          terms: {
            field: NETWORK_CONNECTION_TYPE,
            size: MAX_ITEMS_PER_CHART,
          },
        },
      },
    },
  });

  return [
    {
      key: 'device',
      options:
        calculatePercentage(
          response.aggregations?.devices?.buckets,
          response.aggregations?.devices?.sum_other_doc_count
        ) || [],
    },
    {
      key: 'osVersion',
      options:
        calculatePercentage(
          response.aggregations?.osVersions?.buckets,
          response.aggregations?.osVersions?.sum_other_doc_count
        ) || [],
    },
    {
      key: 'appVersion',
      options:
        calculatePercentage(
          response.aggregations?.appVersions?.buckets,
          response.aggregations?.appVersions?.sum_other_doc_count
        ) || [],
    },
    {
      key: 'netConnectionType',
      options:
        calculatePercentage(
          response.aggregations?.netConnectionTypes?.buckets,
          response.aggregations?.netConnectionTypes?.sum_other_doc_count
        ) || [],
    },
  ];
}

// function calculateTotalCounts(
//   buckets: Array<{ key: string | number; doc_count: number }> = [],
//   otherCount: number = 0
// ) {
//   const options = buckets.map(({ key, doc_count: docCount }) => ({
//     key,
//     docCount,
//   }));
//   if (otherCount > 0) {
//     options.push({
//       key: 'other',
//       docCount: otherCount,
//     });
//   }
// }
function calculatePercentage(
  buckets: Array<{ key: string | number; doc_count: number }> = [],
  otherCount: number = 0
) {
  const total = buckets.reduce(
    (acc, { doc_count: docCount }) => acc + docCount,
    otherCount
  );
  const percentage = buckets.map(({ key, doc_count: docCount }) => ({
    key,
    docCount,
    percentage: ((docCount / total) * 100).toFixed(2),
  }));

  if (otherCount > 0) {
    percentage.push({
      key: 'other',
      docCount: otherCount,
      percentage: ((otherCount / total) * 100).toFixed(2),
    });
  }

  return percentage;
}
