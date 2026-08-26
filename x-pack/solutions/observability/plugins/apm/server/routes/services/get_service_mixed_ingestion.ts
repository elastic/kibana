/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMixedIngestionResponse } from '@kbn/apm-api-shared';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  SERVICE_NAME,
  TELEMETRY_SDK_LANGUAGE,
  TELEMETRY_SDK_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceMixedIngestion({
  serviceName,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}): Promise<ServiceMixedIngestionResponse> {
  const params = {
    apm: {
      events: [ProcessorEvent.error, ProcessorEvent.transaction, ProcessorEvent.metric],
    },
    track_total_hits: false,
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
      ingestion_type: {
        filters: {
          filters: {
            otel_native: {
              bool: {
                should: [
                  { exists: { field: TELEMETRY_SDK_NAME } },
                  { exists: { field: TELEMETRY_SDK_LANGUAGE } },
                ],
                minimum_should_match: 1,
              },
            },
            classic_apm: {
              bool: {
                must_not: [
                  { exists: { field: TELEMETRY_SDK_NAME } },
                  { exists: { field: TELEMETRY_SDK_LANGUAGE } },
                ],
              },
            },
          },
        },
        aggs: {
          min_timestamp: { min: { field: '@timestamp' } },
          max_timestamp: { max: { field: '@timestamp' } },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_service_mixed_ingestion', params);

  const ingestionBuckets = response.aggregations?.ingestion_type?.buckets;
  const otelCount = ingestionBuckets?.otel_native?.doc_count ?? 0;
  const classicCount = ingestionBuckets?.classic_apm?.doc_count ?? 0;
  const hasMultipleAgentTypes = otelCount > 0 && classicCount > 0;

  const classicBucket = ingestionBuckets?.classic_apm;
  const otelBucket = ingestionBuckets?.otel_native;

  const ingestionTimeRanges = hasMultipleAgentTypes
    ? {
        classicApm: {
          from: classicBucket?.min_timestamp?.value ?? start,
          to: classicBucket?.max_timestamp?.value ?? end,
        },
        otelNative: {
          from: otelBucket?.min_timestamp?.value ?? start,
          to: otelBucket?.max_timestamp?.value ?? end,
        },
      }
    : undefined;

  return {
    hasMultipleAgentTypes,
    ingestionTimeRanges,
  };
}
