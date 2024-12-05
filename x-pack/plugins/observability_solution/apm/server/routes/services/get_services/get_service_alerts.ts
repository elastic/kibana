/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  termQuery,
  rangeQuery,
  wildcardQuery,
  termsQuery,
} from '@kbn/observability-plugin/server';
import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { APM_ALERTING_CONSUMERS } from '../../../../common/alerting/config/apm_alerting_feature_ids';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ServiceGroup } from '../../../../common/service_groups';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { MAX_NUMBER_OF_SERVICES } from './get_services_items';
import { serviceGroupWithOverflowQuery } from '../../../lib/service_group_query_with_overflow';

export type ServiceAlertsResponse = Array<{
  serviceName: string;
  alertsCount: number;
}>;

export async function getServicesAlerts({
  apmAlertsClient,
  kuery,
  maxNumServices = MAX_NUMBER_OF_SERVICES,
  serviceGroup,
  serviceName,
  start,
  end,
  environment,
  searchQuery,
}: {
  apmAlertsClient: ApmAlertsClient;
  kuery?: string;
  maxNumServices?: number;
  serviceGroup?: ServiceGroup | null;
  serviceName?: string;
  start: number;
  end: number;
  environment?: string;
  searchQuery?: string;
}): Promise<ServiceAlertsResponse> {
  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termsQuery(ALERT_RULE_PRODUCER, ...APM_ALERTING_CONSUMERS),
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...rangeQuery(start, end),
          ...kqlQuery(kuery),
          ...serviceGroupWithOverflowQuery(serviceGroup),
          ...termQuery(SERVICE_NAME, serviceName),
          ...wildcardQuery(SERVICE_NAME, searchQuery),
          ...environmentQuery(environment),
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: SERVICE_NAME,
          size: maxNumServices,
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: ALERT_UUID,
            },
          },
        },
      },
    },
  };

  const result = await apmAlertsClient.search(params);

  const filterAggBuckets = result.aggregations?.services.buckets ?? [];

  const servicesAlertsCount: Array<{
    serviceName: string;
    alertsCount: number;
  }> = filterAggBuckets.map((bucket) => ({
    serviceName: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
  }));

  return servicesAlertsCount;
}
