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
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export type MobileErrorTermsByFieldResponse = Array<{
  label: string;
  count: number;
}>;

export async function getMobileErrorsTermsByField({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  size,
  fieldName,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  size: number;
  fieldName: string;
}): Promise<MobileErrorTermsByFieldResponse> {
  const response = await apmEventClient.search(
    `get_mobile_terms_by_${fieldName}`,
    {
      apm: {
        events: [ProcessorEvent.error],
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
          terms: {
            terms: {
              field: fieldName,
              size,
            },
          },
        },
      },
    }
  );

  return (
    response.aggregations?.terms?.buckets?.map(({ key, doc_count: count }) => ({
      label: key as string,
      count,
    })) ?? []
  );
}
