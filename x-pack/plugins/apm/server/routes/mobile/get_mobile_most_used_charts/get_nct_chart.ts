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
  NETWORK_CONNECTION_TYPE,
  SERVICE_NAME,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { mergeCountWithOther } from './merge_other_count';
import {
  MobilePropertyType,
  MobilePropertyNctType,
} from '../../../../common/mobile_types';

export interface MobileMostUsedNCTChartResponse {
  key: MobilePropertyNctType;
  options: Array<{
    key: string | number;
    docCount: number;
  }>;
}

export async function getMobileMostUsedNCTCharts({
  kuery,
  apmEventClient,
  serviceName,
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
}): Promise<MobileMostUsedNCTChartResponse> {
  const MAX_ITEMS_PER_CHART = 5;
  const response = await apmEventClient.search(
    'get_mobile_most_used_nct_charts',
    {
      apm: {
        events: [ProcessorEvent.span],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...termQuery(SERVICE_NAME, serviceName),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          netConnectionTypes: {
            terms: {
              field: NETWORK_CONNECTION_TYPE,
              size: MAX_ITEMS_PER_CHART,
            },
          },
        },
      },
    }
  );

  return {
    key: MobilePropertyType.NetworkConnectionType,
    options:
      mergeCountWithOther(
        response.aggregations?.netConnectionTypes?.buckets,
        response.aggregations?.netConnectionTypes?.sum_other_doc_count
      ) || [],
  };
}
