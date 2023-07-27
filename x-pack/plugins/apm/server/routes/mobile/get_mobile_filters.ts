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

type MobileFiltersTypes =
  | 'device'
  | 'appVersion'
  | 'osVersion'
  | 'netConnectionType';

export type MobileFiltersResponse = Array<{
  key: MobileFiltersTypes;
  options: string[];
}>;

export async function getMobileFilters({
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
}): Promise<MobileFiltersResponse> {
  async function getMobileTransactionEventsFilters(): Promise<
    Array<{
      key: MobileFiltersTypes;
      options: string[];
    }>
  > {
    const response = await apmEventClient.search(
      'get_mobile_transaction_events_filters',
      {
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
                size: 10,
              },
            },
            osVersions: {
              terms: {
                field: HOST_OS_VERSION,
                size: 10,
              },
            },
            appVersions: {
              terms: {
                field: SERVICE_VERSION,
                size: 10,
              },
            },
          },
        },
      }
    );

    return [
      {
        key: 'device',
        options:
          response.aggregations?.devices?.buckets?.map(
            ({ key }) => key as string
          ) || [],
      },
      {
        key: 'osVersion',
        options:
          response.aggregations?.osVersions?.buckets?.map(
            ({ key }) => key as string
          ) || [],
      },
      {
        key: 'appVersion',
        options:
          response.aggregations?.appVersions?.buckets?.map(
            ({ key }) => key as string
          ) || [],
      },
    ];
  }

  async function getMobileNetworkConnectionTypeFilters(): Promise<
    Array<{
      key: MobileFiltersTypes;
      options: string[];
    }>
  > {
    const response = await apmEventClient.search(
      'get_mobile_network_connection_type_filters',
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
                size: 10,
              },
            },
          },
        },
      }
    );

    return [
      {
        key: 'netConnectionType',
        options:
          response.aggregations?.netConnectionTypes?.buckets?.map(
            ({ key }) => key as string
          ) || [],
      },
    ];
  }

  const [transactionEventFilters, networkConnectionTypeFilters] =
    await Promise.all([
      getMobileTransactionEventsFilters(),
      getMobileNetworkConnectionTypeFilters(),
    ]);

  return [...transactionEventFilters, ...networkConnectionTypeFilters];
}
