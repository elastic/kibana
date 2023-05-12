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
  SERVICE_NAME,
  SERVICE_VERSION,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { mergeCountWithOther } from './merge_other_count';
import {
  MobilePropertyType,
  MobilePropertyDeviceOsAppVersionType,
} from '../../../../common/mobile_types';

export type MobileMostUsedChartResponse = Array<{
  key: MobilePropertyDeviceOsAppVersionType;
  options: Array<{
    key: string | number;
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
      },
    },
  });

  return [
    {
      key: MobilePropertyType.Device,
      options:
        mergeCountWithOther(
          response.aggregations?.devices?.buckets,
          response.aggregations?.devices?.sum_other_doc_count
        ) || [],
    },
    {
      key: MobilePropertyType.OsVersion,
      options:
        mergeCountWithOther(
          response.aggregations?.osVersions?.buckets,
          response.aggregations?.osVersions?.sum_other_doc_count
        ) || [],
    },
    {
      key: MobilePropertyType.AppVersion,
      options:
        mergeCountWithOther(
          response.aggregations?.appVersions?.buckets,
          response.aggregations?.appVersions?.sum_other_doc_count
        ) || [],
    },
  ];
}
