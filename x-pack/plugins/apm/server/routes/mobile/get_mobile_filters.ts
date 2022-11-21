/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  DEVICE_MODEL_NAME,
  HOST_OS_VERSION,
  NETWORK_CONNECTION_TYPE,
  SERVICE_NAME,
  SERVICE_VERSION,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

type MobileFiltersTypes =
  | 'device'
  | 'appVersion'
  | 'osVersion'
  | 'netConnectionType';
type MobileFilters = Array<{
  key: MobileFiltersTypes;
  options: string[];
  label: string;
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
}): Promise<MobileFilters> {
  const response = await apmEventClient.search('get_mobile_filters', {
    apm: {
      events: [
        ProcessorEvent.error,
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
      ],
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
            field: DEVICE_MODEL_NAME,
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
        netConnectionTypes: {
          terms: {
            field: NETWORK_CONNECTION_TYPE,
            size: 10,
          },
        },
      },
    },
  });

  return [
    {
      key: 'device',
      label: i18n.translate('xpack.apm.mobile.filters.device', {
        defaultMessage: 'Device',
      }),
      options:
        response.aggregations?.devices?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
    {
      key: 'osVersion',
      label: i18n.translate('xpack.apm.mobile.filters.osVersion', {
        defaultMessage: 'OS version',
      }),
      options:
        response.aggregations?.osVersions?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
    {
      key: 'appVersion',
      label: i18n.translate('xpack.apm.mobile.filters.appVersion', {
        defaultMessage: 'App version',
      }),
      options:
        response.aggregations?.appVersions?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
    {
      key: 'netConnectionType',
      label: i18n.translate('xpack.apm.mobile.filters.nct', {
        defaultMessage: 'NCT',
      }),
      options:
        response.aggregations?.netConnectionTypes?.buckets?.map(
          ({ key }) => key as string
        ) || [],
    },
  ];
}
