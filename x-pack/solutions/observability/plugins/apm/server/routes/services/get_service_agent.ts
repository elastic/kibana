/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  PROCESS_RUNTIME_VERSION,
  CLOUD_PROVIDER,
  CLOUD_SERVICE_NAME,
  TELEMETRY_SDK_NAME,
  TELEMETRY_SDK_LANGUAGE,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ServerlessType } from '../../../common/serverless';
import { getServerlessTypeFromCloudData } from '../../../common/serverless';
import { maybe } from '../../../common/utils/maybe';

export interface IngestionTimeRange {
  from: number;
  to: number;
}

export interface ServiceAgentResponse {
  agentName?: string;
  runtimeName?: string;
  runtimeVersion?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  serverlessType?: ServerlessType;
  hasMultipleAgentTypes?: boolean;
  ingestionTimeRanges?: {
    classicApm: IngestionTimeRange;
    otelNative: IngestionTimeRange;
  };
}

export async function getServiceAgent({
  serviceName,
  apmEventClient,
  start,
  end,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ServiceAgentResponse> {
  const fields = asMutableArray([
    AGENT_NAME,
    TELEMETRY_SDK_NAME,
    TELEMETRY_SDK_LANGUAGE,
    SERVICE_RUNTIME_NAME,
    SERVICE_RUNTIME_VERSION,
    PROCESS_RUNTIME_VERSION,
    CLOUD_PROVIDER,
    CLOUD_SERVICE_NAME,
  ] as const);

  const params = {
    apm: {
      events: [ProcessorEvent.error, ProcessorEvent.transaction, ProcessorEvent.metric],
    },
    track_total_hits: 1,
    size: 1,
    _source: [
      AGENT_NAME,
      SERVICE_RUNTIME_NAME,
      SERVICE_RUNTIME_VERSION,
      CLOUD_PROVIDER,
      CLOUD_SERVICE_NAME,
    ],
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          ...rangeQuery(start, end),
          {
            exists: {
              field: AGENT_NAME,
            },
          },
        ],
        should: [
          {
            exists: {
              field: SERVICE_RUNTIME_NAME,
            },
          },
          {
            exists: {
              field: CLOUD_PROVIDER,
            },
          },
          {
            exists: {
              field: CLOUD_SERVICE_NAME,
            },
          },
        ],
      },
    },
    fields,
    sort: { '@timestamp': { order: 'desc' as const }, _score: { order: 'desc' as const } },
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

  const response = await apmEventClient.search('get_service_agent_name', params);
  const hit = maybe(response.hits.hits[0]);
  if (!hit) {
    return {};
  }

  const event = accessKnownApmEventFields(hit.fields);

  const serverlessType = getServerlessTypeFromCloudData(
    event[CLOUD_PROVIDER],
    event[CLOUD_SERVICE_NAME]
  );

  const runtimeVersion =
    event[SERVICE_RUNTIME_VERSION] ??
    (hit.fields?.[PROCESS_RUNTIME_VERSION]?.[0] as string | undefined);

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
    agentName: event[AGENT_NAME],
    telemetrySdkName: event[TELEMETRY_SDK_NAME],
    telemetrySdkLanguage: event[TELEMETRY_SDK_LANGUAGE],
    runtimeName: event[SERVICE_RUNTIME_NAME],
    runtimeVersion,
    serverlessType,
    hasMultipleAgentTypes,
    ingestionTimeRanges,
  };
}
